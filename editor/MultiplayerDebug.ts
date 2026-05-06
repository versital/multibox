// MultiplayerDebug.ts - Diagnostic system for P2P sync
export interface PacketMetadata {
    seq: number;
    senderId: string;
    timestamp: number;
    type: 'SYNC' | 'PING' | 'ACK';
}

export interface SyncPacket {
    meta: PacketMetadata;
    payload: string;
}

export const DebugState = {
    localPeerId: "Unknown",
    role: "Unknown",
    connectionState: "Disconnected",
    connectedPeers: [] as string[],
    lastSentPacket: null as SyncPacket | null,
    lastReceivedPacket: null as SyncPacket | null,
    packetSequence: 0,
    receivedCount: 0,
    sentCount: 0,
    lastSentTime: 0,
    lastReceivedTime: 0,
    lastRerenderTime: 0,
    songChecksum: "Unknown",
    noteCount: 0,
    renderCount: 0,
    latency: 0,
    droppedPackets: 0,
    reconnects: 0,
    activeListeners: 0,
    remoteUpdateReachedState: false,
    remoteUpdateReachedUI: false,
    
    log: (msg: string) => {
        const timestamp = new Date().toISOString().split('T')[1].split('Z')[0];
        console.log(`%c[MULTIBOX-DEBUG] ${timestamp} ${msg}`, "color: #a855f7; font-weight: bold;");
    },

    updateRender() {
        this.renderCount++;
        this.lastRerenderTime = Date.now();
        this.remoteUpdateReachedUI = false; // Reset until next update
    }
};

export function createDebugOverlay() {
    const overlay = document.createElement('div');
    overlay.id = 'multibox-debug-overlay';
    overlay.style.cssText = `
        position: fixed; top: 10px; right: 10px; width: 320px; 
        background: rgba(0,0,0,0.85); color: #0f0; font-family: monospace; 
        font-size: 11px; padding: 10px; border: 1px solid #555; 
        border-radius: 8px; z-index: 9999; pointer-events: none;
        box-shadow: 0 0 10px rgba(0,0,0,0.5); overflow: hidden;
    `;
    document.body.appendChild(overlay);

    const updateUI = () => {
        overlay.innerHTML = `
            <div style="font-weight: bold; border-bottom: 1px solid #555; margin-bottom: 5px; padding-bottom: 5px; color: #a855f7;">
                🛠️ MULTIBOX SYNC DIAGNOSTIC
            </div>
            <div>ID: ${DebugState.localPeerId} (${DebugState.role})</div>
            <div>State: ${DebugState.connectionState} | Peers: ${DebugState.connectedPeers.join(', ')}</div>
            <hr style="border: 0; border-top: 1px solid #333; margin: 5px 0;">
            <div style="display: flex; justify-content: space-between;">
                <span>Sent: ${DebugState.sentCount}</span>
                <span>Recv: ${DebugState.receivedCount}</span>
            </div>
            <div style="color: ${DebugState.lastSentTime ? '#0f0' : '#f00'}">Last Sent: ${DebugState.lastSentTime ? new Date(DebugState.lastSentTime).toLocaleTimeString() : 'NONE'}</div>
            <div style="color: ${DebugState.lastReceivedTime ? '#0f0' : '#f00'}">Last Recv: ${DebugState.lastReceivedTime ? new Date(DebugState.lastReceivedTime).toLocaleTimeString() : 'NONE'}</div>
            <div style="margin-top: 5px;">Hash: ${DebugState.songChecksum.substring(0, 12)}...</div>
            <div>Notes: ${DebugState.noteCount} | Renders: ${DebugState.renderCount}</div>
            <hr style="border: 0; border-top: 1px solid #333; margin: 5px 0;">
            <div style="display: flex; gap: 5px; flex-wrap: wrap;">
                <div style="padding: 2px 4px; background: ${DebugState.remoteUpdateReachedState ? '#050' : '#500'}; border: 1px solid #0f0;">STATE APPLY</div>
                <div style="padding: 2px 4px; background: ${DebugState.remoteUpdateReachedUI ? '#050' : '#500'}; border: 1px solid #0f0;">UI RENDER</div>
            </div>
            <div style="margin-top: 5px; font-size: 9px; color: #aaa; max-height: 60px; overflow-y: auto;">
                Latest Packet: ${DebugState.lastReceivedPacket ? 'SEQ ' + DebugState.lastReceivedPacket.meta.seq : 'None'}
            </div>
        `;
        requestAnimationFrame(updateUI);
    };
    updateUI();
}
