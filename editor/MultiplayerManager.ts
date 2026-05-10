import { SongDocument } from "./SongDocument";
import { Peer, DataConnection } from "peerjs";
import { DebugState, SyncPacket, createDebugOverlay } from "./MultiplayerDebug";

export interface ClockSyncPacket {
    type: 'PING';
    timestamp: number;
    senderId: string;
}

export interface ClockSyncResponse {
    type: 'PONG';
    originTimestamp: number;
    receiveTimestamp: number;
    senderId: string;
}

export class MultiplayerManager {
    private peer: Peer | null = null;
    private connection: DataConnection | null = null;
    private doc: SongDocument;
    private isHost: boolean = false;
    public myId: string = "";
    public connected: boolean = false;
    public _applyingRemoteUpdate: boolean = false;
    private _lastSentSongString: string = "";
    public onPeerIdReady: ((id: string) => void) | null = null;
    
    // Phase 2: Clock Sync
    public ntpOffset: number = 0; // Guest's wall clock offset from Host (ms)
    private pingCount: number = 0;
    private pingSamples: number[] = [];

    constructor(doc: SongDocument) {
        this.doc = doc;
        if (typeof window !== "undefined") {
            if (document.readyState === "complete") {
                createDebugOverlay();
            } else {
                window.addEventListener("load", createDebugOverlay);
            }
        }
    }

    public init(customId?: string) {
        // We use a default PeerJS cloud config for now, but keep room for manual SDP
        this.peer = customId ? new Peer(customId) : new Peer();

        this.peer.on("open", (id: string) => {
            this.myId = id;
            console.log("[PeerJS] open event fired, id:", id);
            console.log("[PeerJS] onPeerIdReady callback exists:", !!this.onPeerIdReady);
            if (this.onPeerIdReady) this.onPeerIdReady(id);
            DebugState.localPeerId = id;
            console.log("My Peer ID is: " + id);
        });

        this.peer.on("connection", (conn: DataConnection) => {
            DebugState.log("[GUEST RECEIVE] Incoming connection request");
            this.isHost = false;
            DebugState.role = "Guest";
            this.setupConnection(conn);
        });

        this.peer.on("error", (err: any) => {
            DebugState.log(`[PEER ERROR] ${err.type}: ${err.message || err}`);
            if (err.type === 'peer-unavailable' || err.type === 'peer-not-found') {
                DebugState.log("[NETWORK] Target peer unavailable. Manual SDP may be required.");
            }
        });
    }

    public getPeerId(): string | null {
        return this.myId || null;
    }

    public connect(targetId: string) {
        if (!this.peer) throw new Error("Peer not initialized");
        DebugState.log(`[SEND] Attempting to connect to ${targetId}`);
        const conn = this.peer.connect(targetId);
        this.isHost = true;
        DebugState.role = "Host";
        this.setupConnection(conn);
    }

    /**
     * Phase 2: Manual SDP Exchange Fallback
     * This allows connecting via copy-paste of signaling data if PeerJS Cloud fails.
     */
    public async generateOffer(): Promise<string> {
        if (!this.peer) throw new Error("Peer not initialized");
        // PeerJS handles the heavy lifting, but we can expose the internal RTCPeerConnection
        // for manual SDP exchange. 
        DebugState.log("[SDP] Generating offer...");
        // In a full implementation, we would access this.peer.connections[0].peerConnection
        // and call createOffer(). For now, we provide a placeholder that indicates the flow.
        return "SDP_OFFER_PLACEHOLDER_" + this.myId; 
    }

    public async acceptOffer(offerSdp: string): Promise<string> {
        DebugState.log("[SDP] Accepting offer...");
        return "SDP_ANSWER_PLACEHOLDER_" + this.myId;
    }

    private setupConnection(conn: DataConnection) {
        this.connection = conn;

        conn.on("open", () => {
            DebugState.log("[CONNECTION] Open");
            DebugState.connectionState = "Connected";
            DebugState.connectedPeers.push(conn.peer);
            this.connected = true;
            
            if (this.isHost) {
                DebugState.log("[HOST] Triggering initial state sync...");
                this.attemptInitialSync(3); // Try 3 times with delays
                this.doc.prompt = null;
            } else {
                DebugState.log("[GUEST] Connected to host. Waiting for sync...");
                this.startClockSync();
            }
        });

        conn.on("data", (data: any) => {
            // Handle binary vs JSON
            let packet: any;
            let isLegacyString = false;

            if (typeof data === "string") {
                try {
                    packet = JSON.parse(data);
                } catch (e) {
                    // If it's not JSON, it might be a legacy raw song string
                    // Base64 strings usually don't start with '{'
                    if (data.length > 0 && data[0] !== '{') {
                        isLegacyString = true;
                        packet = null;
                    } else {
                        DebugState.log("[ERROR] Received invalid JSON packet: " + data);
                        return;
                    }
                }
            } else {
                packet = data;
            }

            if (isLegacyString) {
                DebugState.log("[LEGACY RECEIVE] Received raw song string");
                this.doc.updateSong(data);
                window.location.hash = data;
                return;
            }

            // Handle Clock Sync packets first (High Priority)
            if (packet?.type === 'PING') {
                this.handlePing(packet);
                return;
            }
            if (packet?.type === 'PONG') {
                this.handlePong(packet);
                return;
            }

            // Standard Sync Packets
            if (packet?.type === 'SYNC') {
                DebugState.log(`[REMOTE RECEIVE] Seq: ${packet.meta?.seq} from ${packet.meta?.senderId}`);
                DebugState.lastReceivedPacket = packet;
                DebugState.lastReceivedTime = Date.now();
                DebugState.receivedCount++;
                DebugState.remoteUpdateReachedState = false;

                const songString = packet.payload;
                this.doc.updateSong(songString);
                window.location.hash = songString;
                DebugState.remoteUpdateReachedState = true;
            } else if (packet) {
                DebugState.log("[ERROR] Received unknown packet type: " + packet.type);
            }
        });

        conn.on("close", () => {
            DebugState.log("[CONNECTION] Closed");
            DebugState.connectionState = "Disconnected";
            this.connected = false;
            this.connection = null;
        });
    }

    // --- Phase 2: NTP Clock Synchronization ---

    private startClockSync() {
        DebugState.log("[CLOCK] Starting NTP synchronization...");
        this.pingSamples = [];
        this.pingCount = 0;
        this.sendPing();
    }

    private sendPing() {
        if (!this.connection || !this.connection.open) return;
        
        const packet: ClockSyncPacket = {
            type: 'PING',
            timestamp: Date.now(),
            senderId: this.myId
        };
        this.connection.send(JSON.stringify(packet));
    }

    private handlePing(packet: ClockSyncPacket) {
        // Host receives PING, responds with PONG immediately
        const response: ClockSyncResponse = {
            type: 'PONG',
            originTimestamp: packet.timestamp,
            receiveTimestamp: Date.now(),
            senderId: this.myId
        };
        this.connection?.send(JSON.stringify(response));
    }

    private handlePong(packet: ClockSyncResponse) {
        const now = Date.now();
        // Simplified RTT: current_time - origin_timestamp
        const actualRtt = now - packet.originTimestamp;
        
        // Offset = ((T2 - T1) + (T3 - T4)) / 2
        // T1: origin, T2: receive, T3: response_sent, T4: response_received
        // We assume T2 ~= T3 (instant response)
        
        // Use a simpler RTT/2 estimate for offset calculation
        const sampleOffset = packet.receiveTimestamp - (packet.originTimestamp + actualRtt / 2);
        
        this.pingSamples.push(sampleOffset);
        this.pingCount++;

        if (this.pingCount < 5) {
            setTimeout(() => this.sendPing(), 200);
        } else {
            // Average the samples to reduce jitter
            const sum = this.pingSamples.reduce((a, b) => a + b, 0);
            this.ntpOffset = sum / this.pingSamples.length;
            DebugState.log(`[CLOCK] Sync complete. Offset: ${this.ntpOffset.toFixed(2)}ms`);
        }
    }

    public syncState() {
        if (this._applyingRemoteUpdate) return;
        if (this.connection && this.connection.open) {
            const songString = this.doc.song.toBase64String();
            if (songString === this._lastSentSongString) return;

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
            
            try {
                this.connection.send(JSON.stringify(packet));
                this._lastSentSongString = songString;
            } catch (e) {
                DebugState.log(`[ERROR] Send failed: ${e}`);
            }
        } else {
            DebugState.log("[ERROR] Sync failed: Connection not open");
        }
    }

    private attemptInitialSync(retries: number) {
        if (retries <= 0) {
            DebugState.log("[HOST] Initial sync failed after all retries.");
            return;
        }

        setTimeout(() => {
            DebugState.log(`[HOST] Sync attempt ${4 - retries}...`);
            this.syncState();
            if (!this.connected) {
                this.attemptInitialSync(retries - 1);
            }
        }, 500);
    }
}
