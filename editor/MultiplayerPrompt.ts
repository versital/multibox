import { SongDocument } from "./SongDocument";
import { MultiplayerManager } from "./MultiplayerManager";
import { Prompt } from "./Prompt";
import { HTMLWrapper } from "./HTMLWrapper";

export class MultiplayerPrompt extends Prompt {
    private _doc: SongDocument;
    private _manager: MultiplayerManager;
    private _idInput: HTMLWrapper.Input;
    private _statusText: HTMLWrapper.Text;
    private _manualSdpSection: HTMLWrapper.Div;
    private _offerInput: HTMLWrapper.Input;
    private _answerInput: HTMLWrapper.Input;

    constructor(doc: SongDocument) {
        super("Multiplayer Connection");
        this._doc = doc;
        this._manager = doc.multiplayer;

        this._idInput = new HTMLWrapper.Input("");
        this._statusText = new HTMLWrapper.Text("Enter Peer ID to join or wait for connections.");

        this._manualSdpSection = new HTMLWrapper.Div();
        this._manualSdpSection.style.display = "none";
        this._manualSdpSection.style.marginTop = "10px";
        this._manualSdpSection.style.borderTop = "1px solid #ccc";
        this._manualSdpSection.style.paddingTop = "10px";

        const offerLabel = new HTMLWrapper.Text("Manual SDP Offer:");
        this._offerInput = new HTMLWrapper.Input("");
        this._offerInput.style.width = "100%";
        const genOfferBtn = new HTMLWrapper.Button("Generate Offer");
        genOfferBtn.onClick = async () => {
            const offer = await this._manager.generateOffer();
            this._offerInput.value = offer;
            this._statusText.text = "Offer generated. Send this to your peer.";
        };

        const answerLabel = new HTMLWrapper.Text("Manual SDP Answer:");
        this._answerInput = new HTMLWrapper.Input("");
        this._answerInput.style.width = "100%";
        const acceptOfferBtn = new HTMLWrapper.Button("Accept Answer");
        acceptOfferBtn.onClick = async () => {
            const answer = this._answerInput.value;
            if (!answer) return;
            await this._manager.acceptOffer(answer);
            this._statusText.text = "Answer accepted. Attempting to connect...";
        };

        this._manualSdpSection.append(offerLabel, this._offerInput, genOfferBtn, answerLabel, this._answerInput, acceptOfferBtn);

        const connectBtn = new HTMLWrapper.Button("Connect");
        connectBtn.onClick = () => {
            const id = this._idInput.value;
            if (id) {
                this._manager.connect(id);
                this._statusText.text = `Connecting to ${id}...`;
            }
        };

        const manualBtn = new HTMLWrapper.Button("Manual SDP Mode");
        manualBtn.onClick = () => {
            const isVisible = this._manualSdpSection.style.display === "block";
            this._manualSdpSection.style.display = isVisible ? "none" : "block";
        };

        this.append(
            new HTMLWrapper.Text("Peer ID:"),
            this._idInput,
            connectBtn,
            this._statusText,
            manualBtn,
            this._manualSdpSection
        );
    }

    public updateStatus(text: string) {
        this._statusText.text = text;
    }
}
