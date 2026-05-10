import { SongDocument } from "./SongDocument";
import { MultiplayerManager } from "./MultiplayerManager";
import { Prompt } from "./Prompt";
import { HTML } from "imperative-html/dist/esm/elements-strict";

const { button, div, input, h2, b } = HTML;

export class MultiplayerPrompt implements Prompt {
    public container: HTMLElement;
    private _manager: MultiplayerManager;
    private _statusText: HTMLElement;
    private _manualSdpSection: HTMLElement;

    constructor(doc: SongDocument) {
        this._manager = doc.multiplayer;

        const idInput = input({type: "text", placeholder: "Enter Peer ID"});
        this._statusText = div({style: "margin-top: 8px;"});
        this._statusText.textContent = "Enter Peer ID to join or wait for connections.";

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
            div({}, "Your Peer ID: ", b({id: "myPeerId"}, "...")),
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
