import * as Y from 'yjs';
import { IndexeddbPersistence } from 'y-indexeddb';

export class YjsSongState {
    public doc: Y.Doc;
    private persistence: IndexeddbPersistence;
    
    // Shared Types
    public songMeta: Y.Map<any>;
    public channels: Y.Map<Y.Map<any>>; // channelId -> patternsMap
    
    constructor(roomName: string) {
        this.doc = new Y.Doc();
        this.persistence = new IndexeddbPersistence(roomName, this.doc);
        
        this.songMeta = this.doc.getMap('meta');
        this.channels = this.doc.getMap('channels');
        
        this.persistence.on('synced', () => {
            console.log("[Yjs] Local persistence synced.");
        });
    }

    public setMeta(key: string, value: any) {
        this.doc.transact(() => {
            this.songMeta.set(key, value);
        });
    }

    public getMeta(key: string) {
        return this.songMeta.get(key);
    }

    public getOrCreateChannel(channelId: number) {
        if (!this.channels.has(channelId)) {
            this.channels.set(channelId, new Y.Map());
        }
        return this.channels.get(channelId);
    }

    public setNote(channelId: number, patternId: number, noteId: string, noteData: any) {
        const channel = this.getOrCreateChannel(channelId);
        if (!channel.has(patternId)) {
            channel.set(patternId, new Y.Map());
        }
        const pattern = channel.get(patternId);
        this.doc.transact(() => {
            pattern.set(noteId, noteData);
        });
    }

    public deleteNote(channelId: number, patternId: number, noteId: string) {
        const channel = this.getOrCreateChannel(channelId);
        const pattern = channel.get(patternId);
        if (pattern) {
            this.doc.transact(() => {
                pattern.delete(noteId);
            });
        }
    }

    public getSongState(): any {
        return {
            meta: this.songMeta.toJSON(),
            channels: this.channels.toJSON()
        };
    }

    public destroy() {
        this.persistence.destroy();
        this.doc.destroy();
    }
}
