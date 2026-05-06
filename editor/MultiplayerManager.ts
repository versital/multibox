import { SongDocument } from "./SongDocument";
import { Peer } from "peerjs";
import { DebugState, SyncPacket, createDebugOverlay } from "./MultiplayerDebug";

export class MultiplayerManager {
    private peer: Peer | null = null;
    private connection: any = null;
    private doc: SongDocument;
    private isHost: boolean = false;
    public myId: string = "";
    public connected: boolean = false;

    constructor(doc: SongDocument) {
        this.doc = doc;
        // Use window.onload to ensure DOM is ready for the overlay
        if (typeof window !== "undefined") {
            if (document.readyState === "complete") {
                createDebugOverlay();
            } else {
                window.addEventListener("load", createDebugOverlay);
            }
        }
    }

    public init(customId?: string) {
        this.peer = customId ? new Peer(customId) : new Peer();

        this.peer.on("open", (id: string) => {
            this.myId = id;
            DebugState.localPeerId = id;
            console.log("My Peer ID is: " + id);
        });

        this.peer.on("connection", (conn: any) => {
            DebugState.log("[HOST RECEIVE] Incoming connection request");
            this.isHost = true;
            DebugState.role = "Host";
            this.setupConnection(conn);
        });
    }

    public connect(targetId: string) {
        if (!this.peer) throw new Error("Peer not initialized");
        DebugState.log(`[SEND] Attempting to connect to ${targetId}`);
        const conn = this.peer.connect(targetId);
        this.isHost = false;
        DebugState.role = "Guest";
        this.setupConnection(conn);
    }

    private setupConnection(conn: any) {
        this.connection = conn;

        conn.on("open", () => {
            DebugState.log("[CONNECTION] Open");
            DebugState.connectionState = "Connected";
            DebugState.connectedPeers.push(conn.peer);
            this.connected = true;
            // Host sends the current song state immediately upon connection
            if (this.isHost) {
                DebugState.log("[HOST] Sending initial state to new peer");
                this.syncState();
                // Close the Multiplayer Connection prompt if it's open
                this.doc.prompt = null;
            }
        });

        conn.on("data", (data: any) => {
            let packet: SyncPacket;
            try {
                packet = typeof data === "string" ? JSON.parse(data) : data;
            } catch (e) {
                DebugState.log("[ERROR] Received non-JSON packet: " + data);
                return;
            }

            DebugState.log(`[REMOTE RECEIVE] Seq: ${packet.meta.seq} from ${packet.meta.senderId}`);
            DebugState.lastReceivedPacket = packet;
            DebugState.lastReceivedTime = Date.now();
            DebugState.receivedCount++;
            DebugState.remoteUpdateReachedState = false;

            if (packet.type === 'SYNC') {
                const songString = packet.payload;
                this.doc.updateSong(songString);
            }
        });

        conn.on("close", () => {
            DebugState.log("[CONNECTION] Closed");
            DebugState.connectionState = "Disconnected";
            this.connected = false;
            this.connection = null;
        });
    }

    public syncState() {
        if (this.connection && this.connection.open) {
            const songString = this.doc.song.toBase64String();
            const packet: SyncPacket = {
                meta: {
                    seq: ++DebugState.packetSequence,
                    senderId: this.myId,
                    timestamp: Date.now(),
                    type: 'SYNC'
                },
                payload: songString
            };
            
            DebugState.log(`[SEND] Syncing state (Seq: ${packet.meta.seq})`);
            DebugState.lastSentPacket = packet;
            DebugState.lastSentTime = Date.now();
            DebugState.sentCount++;
            
            this.connection.send(JSON.stringify(packet));
        } else {
            DebugState.log("[ERROR] Sync failed: Connection not open");
        }
    }
}
