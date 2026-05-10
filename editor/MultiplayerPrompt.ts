import { SongDocument } from "./SongDocument";
import { MultiplayerManager } from "./MultiplayerManager";
import { Prompt } from "./Prompt";
import { HTML } from "imperative-html/dist/esm/elements-strict";

const { button, div, input, h2, b } = HTML;

export class MultiplayerPrompt implements Prompt {
    public container: HTMLElement;
    private _manager: MultiplayerManager;
    private _myPeerIdDisplay: HTMLElement;
    private _statusText: HTMLElement;
    private _manualSdpSection: HTMLElement;

    constructor(doc: SongDocument) {
        this._manager = doc.multiplayer;
        console.log("[Prompt] constructor called");
        console.log("[Prompt] getPeerId() returned:", this._manager.getPeerId());
        console.log("[Prompt] subscribing to onPeerIdReady");

        const idInput = input({type: "text", placeholder: "Enter Peer ID"});
        this._myPeerIdDisplay = b({}, "...");
        this._myPeerIdDisplay.style.userSelect = "text";
        this._myPeerIdDisplay.style.cursor = "text";
        this._statusText = div({style: "margin-top: 8px;"});
        this._statusText.textContent = "Enter Peer ID to join or wait for connections.";

        // If ID already assigned, show it immediately
        const existingId = this._manager.getPeerId();
        if (existingId) {
            this._myPeerIdDisplay.textContent = existingId;
        } else {
            // Otherwise wait for it
            this._manager.onPeerIdReady = (id: string) => {
                this._myPeerIdDisplay.textContent = id;
            };
        }

        const copyBtn = button({}, "Copy");
        copyBtn.addEventListener("click", () => {
            const id = this._manager.getPeerId();
            if (id) {
                navigator.clipboard.writeText(id).then(() => {
                    copyBtn.textContent = "Copied!";
                    setTimeout(() => {
                        copyBtn.textContent = "Copy";
                    }, 2000);
                });
            }
        });

        const connectBtn = button({}, "Connect");
        connectBtn.addEventListener("click", () => {
            const id = idInput.value.trim();
            if (id) {
                this._manager.connect(id);
                this._statusText.textContent = `Connecting to ${id}...`;
            }
        });

        this._manualSdpSection = div({style: "display:none; margin-top:10px;"});

        const offerInput = input({type: "text", placeholder: "SDP Offer"});
        const genOfferBtn = button({}, "Generate Offer");
        genOfferBtn.addEventListener("click", async () => {
            const offer = await this._manager.generateOffer();
            offerInput.value = offer;
            this._statusText.textContent = "Offer generated. Send to your peer.";
        });

        const answerInput = input({type: "text", placeholder: "SDP Answer"});
        const acceptBtn = button({}, "Accept Answer");
        acceptBtn.addEventListener("click", async () => {
            const answer = answerInput.value.trim();
            if (!answer) return;
            await this._manager.acceptOffer(answer);
            this._statusText.textContent = "Answer accepted. Connecting...";
        });

        const manualBtn = button({}, "Manual SDP Mode");
        manualBtn.addEventListener("click", () => {
            const visible = this._manualSdpSection.style.display === "block";
            this._manualSdpSection.style.display = visible ? "none" : "block";
        });

        this._manualSdpSection.append(
            div({}, "SDP Offer:"), offerInput, genOfferBtn,
            div({}, "SDP Answer:"), answerInput, acceptBtn
        );

        this.container = div({class: "prompt noSelection"},
            h2({}, "Multiplayer"),
            div({style: "display:flex; align-items:center; gap:8px; margin-bottom:8px;"},
                "Your Peer ID: ",
                this._myPeerIdDisplay,
                copyBtn
            ),
            div({}, "Connect to Peer:"),
            idInput,
            connectBtn,
            this._statusText,
            manualBtn,
            this._manualSdpSection,
            button({class: "cancelButton"})
        );
    }

    public cleanUp = (): void => {};

    public updateStatus(text: string): void {
        this._statusText.textContent = text;
    }
}
