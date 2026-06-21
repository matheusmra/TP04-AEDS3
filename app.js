/**
 * TP04 - Algoritmos e Estruturas de Dados III
 * Arquivo único: App contém FileSimulator como classe estática aninhada.
 */

/**
 * ByteStream.js
 * Biblioteca para serialização e deserialização de tipos primitivos Java
 * em vetores de bytes (Int8Array), compatível com DataOutputStream / DataInputStream.
 *
 * Convenções:
 *  - Todos os tipos numéricos são armazenados em big-endian (Java padrão).
 *  - writeChar   → UTF-16BE (2 bytes), como em Java.
 *  - writeString → prefixado por 2 bytes (short) com o comprimento em bytes UTF-8,
 *                  seguido dos bytes UTF-8 da string (formato writeUTF do Java).
 *  - writeDate   → int de 4 bytes: número de dias desde 01/01/1970 (epoch day).
 *  - writeDateTime → long de 8 bytes: milissegundos desde 01/01/1970 00:00:00.000 UTC.
 *
 * Autor: Marcos Kutova
 * gerado com auxílio de Claude (Anthropic), 2025.
 */

const ByteStream = (() => {
  function bufferToInt8(buffer) { return new Int8Array(buffer); }
  function toInt8Array(bytes) {
    if (bytes instanceof Int8Array) return bytes;
    if (bytes instanceof ArrayBuffer) return new Int8Array(bytes);
    if (ArrayBuffer.isView(bytes)) return new Int8Array(bytes.buffer, bytes.byteOffset, bytes.byteLength);
    throw new TypeError("Esperado um Int8Array, Uint8Array ou ArrayBuffer.");
  }
  function viewOf(bytes) { return new DataView(bytes.buffer, bytes.byteOffset, bytes.byteLength); }

  function writeByte(value) { const buf = new ArrayBuffer(1); new DataView(buf).setInt8(0, value); return bufferToInt8(buf); }
  function writeShort(value) { const buf = new ArrayBuffer(2); new DataView(buf).setInt16(0, value, false); return bufferToInt8(buf); }
  function writeInt(value) { const buf = new ArrayBuffer(4); new DataView(buf).setInt32(0, value, false); return bufferToInt8(buf); }
  function writeLong(value) { const buf = new ArrayBuffer(8); new DataView(buf).setBigInt64(0, BigInt(value), false); return bufferToInt8(buf); }
  function writeBoolean(value) { const buf = new ArrayBuffer(1); new DataView(buf).setInt8(0, value ? 1 : 0); return bufferToInt8(buf); }
  function writeChar(value) {
    const codePoint = typeof value === "string" ? value.charCodeAt(0) : value;
    const buf = new ArrayBuffer(2); new DataView(buf).setUint16(0, codePoint, false); return bufferToInt8(buf);
  }
  function writeFloat(value) { const buf = new ArrayBuffer(4); new DataView(buf).setFloat32(0, value, false); return bufferToInt8(buf); }
  function writeDouble(value) { const buf = new ArrayBuffer(8); new DataView(buf).setFloat64(0, value, false); return bufferToInt8(buf); }
  function writeString(value) {
    const encoded = new TextEncoder().encode(String(value));
    const length = encoded.length;
    if (length > 0xffff) throw new RangeError(`String muito longa para writeUTF: ${length} bytes (máximo 65535).`);
    const buf = new ArrayBuffer(2 + length);
    const view = new DataView(buf);
    view.setUint16(0, length, false);
    const result = new Int8Array(buf);
    result.set(encoded, 2);
    return result;
  }
  function writeDate(value) {
    let date;
    if (typeof value === "string") {
      const parts = value.split("/");
      if (parts.length !== 3) throw new TypeError("Formato esperado: dd/mm/aaaa");
      date = new Date(Date.UTC(parseInt(parts[2]), parseInt(parts[1]) - 1, parseInt(parts[0])));
    } else {
      date = new Date(Date.UTC(value.getFullYear(), value.getMonth(), value.getDate()));
    }
    const epochDay = Math.round(date.getTime() / 86_400_000);
    return writeInt(epochDay);
  }
  function writeDateTime(value) {
    let millis;
    if (typeof value === "string") {
      const [datePart, timePart] = value.split(" ");
      if (!datePart || !timePart) throw new TypeError("Formato esperado: dd/mm/aaaa hh:mm:ss");
      const [d, m, y] = datePart.split("/");
      const [h, min, s] = timePart.split(":");
      millis = Date.UTC(parseInt(y), parseInt(m) - 1, parseInt(d), parseInt(h), parseInt(min), parseInt(s));
    } else { millis = value.getTime(); }
    return writeLong(millis);
  }

  function readByte(bytes, offset = 0) { return viewOf(toInt8Array(bytes)).getInt8(offset); }
  function readShort(bytes, offset = 0) { return viewOf(toInt8Array(bytes)).getInt16(offset, false); }
  function readInt(bytes, offset = 0) { return viewOf(toInt8Array(bytes)).getInt32(offset, false); }
  function readLong(bytes, offset = 0) { return viewOf(toInt8Array(bytes)).getBigInt64(offset, false); }
  function readBoolean(bytes, offset = 0) { return viewOf(toInt8Array(bytes)).getInt8(offset) !== 0; }
  function readChar(bytes, offset = 0) {
    const codePoint = viewOf(toInt8Array(bytes)).getUint16(offset, false);
    return String.fromCharCode(codePoint);
  }
  function readFloat(bytes, offset = 0) { return viewOf(toInt8Array(bytes)).getFloat32(offset, false); }
  function readDouble(bytes, offset = 0) { return viewOf(toInt8Array(bytes)).getFloat64(offset, false); }
  function readString(bytes, offset = 0) {
    const arr = toInt8Array(bytes);
    const view = viewOf(arr);
    const length = view.getUint16(offset, false);
    const uint8 = new Uint8Array(arr.buffer, arr.byteOffset + offset + 2, length);
    return new TextDecoder("utf-8").decode(uint8);
  }
  function readDate(bytes, offset = 0) {
    const epochDay = readInt(bytes, offset);
    return new Date(epochDay * 86_400_000);
  }
  function readDateTime(bytes, offset = 0) {
    const millis = readLong(bytes, offset);
    return new Date(Number(millis));
  }

  return {
    writeByte, writeShort, writeInt, writeLong, writeBoolean, writeChar, writeFloat, writeDouble, writeString, writeDate, writeDateTime,
    readByte, readShort, readInt, readLong, readBoolean, readChar, readFloat, readDouble, readString, readDate, readDateTime,
  };
})();

class App {

    // ===========================================================
    // FILESIMULATOR — Classe estática aninhada dentro de App
    // Gerencia o Uint8Array que simula o arquivo binário em memória
    // ===========================================================

    static FileSimulator = class {

        constructor(storageKey = 'binary_file_sim') {
            this.storageKey = storageKey;
            this.buffer = new Uint8Array(0);
            this.load();
            if (this.buffer.length === 0) this.initHeader();
        }

        // ---- Persistência ----

        load() {
            const data = localStorage.getItem(this.storageKey);
            if (data) {
                try {
                    const str = window.atob(data);
                    this.buffer = new Uint8Array(str.length);
                    for (let i = 0; i < str.length; i++) this.buffer[i] = str.charCodeAt(i);

                    // Sanity check para migração de Endianness / corrupção
                    if (this.buffer.length > 8) {
                        const dataSize = this.readInt(9);
                        if (dataSize < 0 || dataSize > 1000000 || (8 + 5 + dataSize > this.buffer.length)) {
                            throw new Error("Tamanho de registro inválido (provável mudança de endianness).");
                        }
                    }
                } catch (e) {
                    console.error('Arquivo corrompido ou formato incompatível detectado. Resetando arquivo...', e);
                    this.buffer = new Uint8Array(0);
                }
            }
        }

        save() {
            let binary = '';
            for (let i = 0; i < this.buffer.byteLength; i++) binary += String.fromCharCode(this.buffer[i]);
            localStorage.setItem(this.storageKey, window.btoa(binary));
        }

        // ---- Gerenciamento do vetor ----

        getSize() { return this.buffer.length; }

        expand(bytes) {
            const nb = new Uint8Array(this.buffer.length + bytes);
            nb.set(this.buffer);
            this.buffer = nb;
        }

        // ---- Tipos primitivos (integrados com ByteStream) ----

        writeByte(offset, value)  { this.buffer.set(ByteStream.writeByte(value), offset); }
        readByte(offset)          { return ByteStream.readByte(this.buffer, offset); }

        writeInt(offset, value)   { this.buffer.set(ByteStream.writeInt(value), offset); }
        readInt(offset)           { return ByteStream.readInt(this.buffer, offset); }
        
        writeFloat(offset, value) { this.buffer.set(ByteStream.writeFloat(value), offset); }
        readFloat(offset)         { return ByteStream.readFloat(this.buffer, offset); }

        writeString(offset, str) {
            const bytes = ByteStream.writeString(str);
            this.buffer.set(bytes, offset);
            return bytes.length;
        }

        readString(offset) {
            const value = ByteStream.readString(this.buffer, offset);
            // Lê o tamanho guardado nos primeiros 2 bytes para descobrir o avanço de bytes
            const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
            const strLen = view.getUint16(offset, false);
            return { value, bytesRead: 2 + strLen };
        }

        // ---- Cabeçalho (8 bytes) ----
        // Offset 0: lastId (int32)  |  Offset 4: deletedHead (int32, -1 = vazio)

        initHeader() {
            this.expand(8);
            this.writeInt(0, 0);
            this.writeInt(4, -1);
            this.save();
        }

        getHeader() {
            return { lastId: this.readInt(0), deletedHead: this.readInt(4) };
        }

        setHeader(lastId, deletedHead) {
            this.writeInt(0, lastId);
            this.writeInt(4, deletedHead);
            this.save();
        }

        // ---- Serialização ----

        calculateRecordDataSize(id, nome, preco, quantidade, categoria) {
            const enc = new TextEncoder();
            return 4 + (2 + enc.encode(nome).length) + (2 + enc.encode(categoria).length) + 4 + 4;
        }

        writeRecordData(offset, id, nome, preco, quantidade, categoria) {
            let cur = offset;
            this.writeInt(cur, id);   cur += 4;
            cur += this.writeString(cur, nome);
            cur += this.writeString(cur, categoria);
            this.writeInt(cur, quantidade);   cur += 4;
            this.writeFloat(cur, preco);
        }

        // Lê e deserializa todos os campos a partir de dataOffset (após lápide+tamanho)
        readRecordData(dataOffset) {
            let cur = dataOffset;
            const id = this.readInt(cur);             cur += 4;
            const nomeR = this.readString(cur);        cur += nomeR.bytesRead;
            const catR  = this.readString(cur);        cur += catR.bytesRead;
            const quantidade = this.readInt(cur);      cur += 4;
            const preco      = this.readFloat(cur);    cur += 4;
            return { id, nome: nomeR.value, categoria: catR.value, quantidade, preco, bytesRead: cur - dataOffset };
        }

        // ---- CREATE ----

        insertRecord(nome, preco, quantidade, categoria) {
            const header   = this.getHeader();
            const newId    = header.lastId + 1;
            const reqSize  = this.calculateRecordDataSize(newId, nome, preco, quantidade, categoria);

            let prev = -1, curr = header.deletedHead;
            let foundOffset = -1, blockSize = 0, nextOfFound = -1;

            while (curr !== -1) {
                const sz   = this.readInt(curr + 1);
                const next = this.readInt(curr + 5);
                if (sz >= reqSize) { foundOffset = curr; blockSize = sz; nextOfFound = next; break; }
                prev = curr; curr = next;
            }

            if (foundOffset !== -1) {
                if (prev === -1) this.setHeader(newId, nextOfFound);
                else { this.writeInt(prev + 5, nextOfFound); this.setHeader(newId, header.deletedHead); }
                this.writeByte(foundOffset, 0);
                this.writeRecordData(foundOffset + 5, newId, nome, preco, quantidade, categoria);
                this.save();
                return newId;
            }

            return this._appendRecord(nome, preco, quantidade, categoria);
        }

        _appendRecord(nome, preco, quantidade, categoria) {
            const header   = this.getHeader();
            const newId    = header.lastId + 1;
            const dataSize = this.calculateRecordDataSize(newId, nome, preco, quantidade, categoria);
            const offset   = this.getSize();
            this.expand(1 + 4 + dataSize);
            this.writeByte(offset, 0);
            this.writeInt(offset + 1, dataSize);
            this.writeRecordData(offset + 5, newId, nome, preco, quantidade, categoria);
            this.setHeader(newId, header.deletedHead);
            this.save();
            return newId;
        }

        // ---- READ ----

        findById(id) {
            let offset = 8;
            while (offset < this.getSize()) {
                const tombstone = this.readByte(offset);
                const dataSize  = this.readInt(offset + 1);
                if (tombstone === 0) {
                    const record = this.readRecordData(offset + 5);
                    if (record.id === id) return { offset, tombstone, dataSize, record };
                }
                offset += 5 + dataSize;
            }
            return null;
        }

        findByName(nome) {
            const results = [];
            const term    = nome.toLowerCase();
            let offset    = 8;
            while (offset < this.getSize()) {
                const tombstone = this.readByte(offset);
                const dataSize  = this.readInt(offset + 1);
                if (tombstone === 0) {
                    const record = this.readRecordData(offset + 5);
                    if (record.nome.toLowerCase().includes(term)) results.push({ offset, tombstone, dataSize, record });
                }
                offset += 5 + dataSize;
            }
            return results;
        }

        // ---- UPDATE ----

        updateRecord(id, nome, preco, quantidade, categoria) {
            const found = this.findById(id);
            if (!found) return null;

            const { offset, dataSize: oldSize } = found;
            const newSize = this.calculateRecordDataSize(id, nome, preco, quantidade, categoria);

            if (newSize <= oldSize) {
                this.writeRecordData(offset + 5, id, nome, preco, quantidade, categoria);
                this.save();
                return { status: 'overwrite', id };
            }

            this.deleteRecord(id);
            const header   = this.getHeader();
            const dataSize = this.calculateRecordDataSize(id, nome, preco, quantidade, categoria);
            const newOffset = this.getSize();
            this.expand(1 + 4 + dataSize);
            this.writeByte(newOffset, 0);
            this.writeInt(newOffset + 1, dataSize);
            this.writeRecordData(newOffset + 5, id, nome, preco, quantidade, categoria);
            this.setHeader(header.lastId, header.deletedHead);
            this.save();
            return { status: 'relocated', id };
        }

        // ---- DELETE ----

        deleteRecord(id) {
            const found = this.findById(id);
            if (!found) return false;
            const { offset } = found;
            const header = this.getHeader();
            this.writeByte(offset, 1);
            this.writeInt(offset + 5, header.deletedHead);
            this.setHeader(header.lastId, offset);
            this.save();
            return true;
        }

        // ---- Mapa de bytes para o visualizador ----

        getByteMap() {
            const map  = [];
            const size = this.getSize();

            for (let i = 0; i < 8 && i < size; i++)
                map.push({ index: i, value: this.buffer[i], type: 'bg-header', label: 'Cabeçalho' });

            let offset = 8;
            while (offset < size) {
                const tombstone = this.buffer[offset];
                const dataSize  = this.readInt(offset + 1);

                map.push({ index: offset, value: tombstone,
                    type:  tombstone === 0 ? 'bg-tombstone-active' : 'bg-tombstone-deleted',
                    label: 'Lápide' });

                for (let i = 0; i < 4; i++)
                    map.push({ index: offset + 1 + i, value: this.buffer[offset + 1 + i], type: 'bg-size', label: 'Tamanho' });

                let d = offset + 5;

                if (tombstone === 0) {
                    for (let i = 0; i < 4; i++) map.push({ index: d++, value: this.buffer[d - 1], type: 'bg-id', label: 'ID' });

                    const nomeStr = this.readString(d);
                    for (let i = 0; i < nomeStr.bytesRead; i++) map.push({ index: d++, value: this.buffer[d - 1], type: 'bg-name', label: 'Nome' });

                    const catStr = this.readString(d);
                    for (let i = 0; i < catStr.bytesRead; i++) map.push({ index: d++, value: this.buffer[d - 1], type: 'bg-instructor', label: 'Categoria' });

                    for (let i = 0; i < 4; i++) map.push({ index: d++, value: this.buffer[d - 1], type: 'bg-capacity', label: 'Quantidade' });
                    for (let i = 0; i < 4; i++) map.push({ index: d++, value: this.buffer[d - 1], type: 'bg-price', label: 'Preço' });

                    while (d < offset + 5 + dataSize)
                        map.push({ index: d++, value: this.buffer[d - 1], type: 'bg-tombstone-deleted', label: 'Lixo (Fragmentação)' });
                } else {
                    for (let i = 0; i < 4; i++) map.push({ index: d++, value: this.buffer[d - 1], type: 'bg-id', label: 'Ponteiro Próx. Excluído' });
                    while (d < offset + 5 + dataSize)
                        map.push({ index: d++, value: this.buffer[d - 1], type: 'bg-tombstone-deleted', label: 'Lixo (Excluído)' });
                }

                offset += 5 + dataSize;
            }
            return map;
        }
    };

    // ===========================================================
    // CONSTRUTOR E INICIALIZAÇÃO
    // ===========================================================

    constructor() {
        this.fileSimulator      = new App.FileSimulator();
        this.highlightedOffsets = new Set();
        this.pendingDeleteId    = null;

        this.initializeUI();
    }

    initializeUI() {
        this._initTabs();
        this._initFormCreate();
        this._initFormRead();
        this._initFormUpdate();
        this._initFormDelete();
        this._initModal();

        this.updateStatsDisplay();
        this.renderBytes();
    }

    // ===========================================================
    // TABS
    // ===========================================================

    _initTabs() {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.addEventListener('click', () => this.switchTab(btn.dataset.tab));
        });
    }

    switchTab(tabId) {
        document.querySelectorAll('.tab-btn').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabId);
        });
        document.querySelectorAll('.tab-content').forEach(content => {
            content.classList.toggle('active', content.id === `tab-${tabId}`);
        });
        if (tabId !== 'read') this.clearHighlight();
    }

    // ===========================================================
    // CREATE
    // ===========================================================

    _initFormCreate() {
        const form = document.getElementById('form-curso');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const nome      = document.getElementById('nome').value.trim();
            const instrutor = document.getElementById('instrutor').value.trim();
            const vagas     = parseInt(document.getElementById('vagas').value, 10);
            const valorStr  = document.getElementById('valor').value;
            const valor     = valorStr === '' ? 0 : parseFloat(valorStr);

            if (!nome || !instrutor || isNaN(vagas) || isNaN(valor)) {
                this.showToast('Preencha todos os campos corretamente.', 'error');
                return;
            }

            const newId = this.fileSimulator.insertRecord(nome, valor, vagas, instrutor);
            this.showToast(`✓ Curso "${nome}" gravado com ID #${newId}.`, 'success');

            const found = this.fileSimulator.findById(newId);
            if (found) this._scheduleHighlight(found.offset, found.dataSize);

            form.reset();
            document.getElementById('nome').focus();
            this.updateStatsDisplay();
            this.renderBytes();
        });
    }

    // ===========================================================
    // READ
    // ===========================================================

    _initFormRead() {
        const form = document.getElementById('form-busca');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const termo = document.getElementById('termo-busca').value.trim();
            const tipo  = document.querySelector('input[name="tipoBusca"]:checked')?.value;

            if (!termo) { this.showToast('Digite um termo para buscar.', 'error'); return; }

            this.clearHighlight();

            if (tipo === 'id') {
                const id = parseInt(termo, 10);
                if (isNaN(id)) { this.showToast('ID inválido. Digite um número inteiro.', 'error'); return; }
                const result = this.fileSimulator.findById(id);
                this._renderSearchResults(result ? [result] : [], termo);
            } else {
                const results = this.fileSimulator.findByName(termo);
                this._renderSearchResults(results, termo);
            }
        });

        document.getElementById('btn-clear-search')?.addEventListener('click', () => {
            this._clearSearchResults();
            this.clearHighlight();
            document.getElementById('termo-busca').value = '';
            document.getElementById('termo-busca').focus();
        });
    }

    _renderSearchResults(results, termo) {
        const container  = document.getElementById('search-results-container');
        const list       = document.getElementById('search-results-list');
        const notFound   = document.getElementById('search-not-found');
        const countLabel = document.getElementById('results-count-label');

        list.innerHTML = '';

        if (results.length === 0) {
            container.style.display = 'none';
            notFound.style.display  = 'flex';
            this.showToast(`Nenhum registro encontrado para "${termo}".`, 'info');
            return;
        }

        notFound.style.display  = 'none';
        container.style.display = 'flex';
        countLabel.textContent  =
            `${results.length} resultado${results.length > 1 ? 's' : ''} encontrado${results.length > 1 ? 's' : ''}`;

        // Destaca bytes de todos os registros encontrados
        const allOffsets = [];
        results.forEach(r => {
            for (let i = r.offset; i < r.offset + 5 + r.dataSize; i++) allOffsets.push(i);
        });
        this._applyHighlight(allOffsets);

        results.forEach(r => list.appendChild(this._buildResultCard(r)));
        document.getElementById('bytes-grid')?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }

    _buildResultCard(result) {
        const { offset, dataSize, record } = result;
        const preco = record.preco.toFixed(2).replace('.', ',');

        const card = document.createElement('div');
        card.className  = 'result-card result-found';
        card.dataset.id = record.id;
        card.innerHTML  = `
            <div class="result-card-header">
                <span class="result-id-badge">ID #${record.id}</span>
                <span class="result-offset-badge">offset: 0x${offset.toString(16).toUpperCase().padStart(4, '0')}</span>
            </div>
            <div class="result-card-body">
                <div class="result-field">
                    <span class="result-field-label">Nome</span>
                    <span class="result-field-value" title="${record.nome}">${record.nome}</span>
                </div>
                <div class="result-field">
                    <span class="result-field-label">Instrutor</span>
                    <span class="result-field-value" title="${record.categoria}">${record.categoria}</span>
                </div>
                <div class="result-field">
                    <span class="result-field-label">Vagas</span>
                    <span class="result-field-value">${record.quantidade}</span>
                </div>
                <div class="result-field">
                    <span class="result-field-label">Valor</span>
                    <span class="result-field-value">R$ ${preco}</span>
                </div>
                <div class="result-field">
                    <span class="result-field-label">Tamanho</span>
                    <span class="result-field-value font-mono">${dataSize + 5} bytes</span>
                </div>
            </div>
            <div class="result-card-actions">
                <button class="btn btn-warning btn-edit-record"
                    data-id="${record.id}" data-nome="${record.nome}"
                    data-instrutor="${record.categoria}" data-vagas="${record.quantidade}"
                    data-valor="${record.preco}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"></path>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"></path>
                    </svg>
                    Editar
                </button>
                <button class="btn btn-danger btn-delete-record"
                    data-id="${record.id}" data-nome="${record.nome}">
                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                        <polyline points="3 6 5 6 21 6"></polyline>
                        <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"></path>
                    </svg>
                    Excluir
                </button>
            </div>`;

        card.querySelector('.btn-edit-record').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            this._openEditForm({
                id:        parseInt(btn.dataset.id, 10),
                nome:      btn.dataset.nome,
                instrutor: btn.dataset.instrutor,
                vagas:     parseInt(btn.dataset.vagas, 10),
                valor:     parseFloat(btn.dataset.valor)
            });
        });

        card.querySelector('.btn-delete-record').addEventListener('click', (e) => {
            const btn = e.currentTarget;
            this._openDeleteModal(parseInt(btn.dataset.id, 10), btn.dataset.nome);
        });

        return card;
    }

    _clearSearchResults() {
        document.getElementById('search-results-container').style.display = 'none';
        document.getElementById('search-not-found').style.display         = 'none';
        document.getElementById('search-results-list').innerHTML          = '';
    }

    // ===========================================================
    // UPDATE
    // ===========================================================

    _initFormUpdate() {
        const form = document.getElementById('form-update');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const id        = parseInt(document.getElementById('edit-id').value, 10);
            const nome      = document.getElementById('edit-nome').value.trim();
            const instrutor = document.getElementById('edit-instrutor').value.trim();
            const vagas     = parseInt(document.getElementById('edit-vagas').value, 10);
            const valorStr  = document.getElementById('edit-valor').value;
            const valor     = valorStr === '' ? 0 : parseFloat(valorStr);

            if (!nome || !instrutor || isNaN(vagas) || isNaN(valor)) {
                this.showToast('Preencha todos os campos corretamente.', 'error');
                return;
            }

            const result = this.fileSimulator.updateRecord(id, nome, valor, vagas, instrutor);

            if (!result) {
                this.showToast(`Registro #${id} não encontrado.`, 'error');
                return;
            }

            this.showToast(
                result.status === 'overwrite'
                    ? `✓ Registro #${id} atualizado no mesmo local.`
                    : `⚡ Registro #${id} realocado — tamanho maior: antigo marcado como excluído.`,
                result.status === 'overwrite' ? 'success' : 'warning'
            );

            this._closeEditForm();
            this._clearSearchResults();
            this.clearHighlight();
            this.updateStatsDisplay();
            this.renderBytes();

            const found = this.fileSimulator.findById(id);
            if (found) setTimeout(() => { this._scheduleHighlight(found.offset, found.dataSize); this.renderBytes(); }, 50);
        });

        document.getElementById('btn-cancel-update')?.addEventListener('click', () => this._closeEditForm());
    }

    _openEditForm({ id, nome, instrutor, vagas, valor }) {
        document.getElementById('edit-id').value        = id;
        document.getElementById('edit-nome').value      = nome;
        document.getElementById('edit-instrutor').value = instrutor;
        document.getElementById('edit-vagas').value     = vagas;
        document.getElementById('edit-valor').value     = valor.toFixed(2);
        document.getElementById('update-placeholder').style.display = 'none';
        document.getElementById('form-update').style.display        = 'flex';
        this.switchTab('update');
    }

    _closeEditForm() {
        document.getElementById('form-update').style.display        = 'none';
        document.getElementById('update-placeholder').style.display = 'flex';
        document.getElementById('form-update').reset();
    }

    // ===========================================================
    // DELETE
    // ===========================================================

    _initFormDelete() {
        const form = document.getElementById('form-delete');
        if (!form) return;

        form.addEventListener('submit', (e) => {
            e.preventDefault();
            const id = parseInt(document.getElementById('delete-id').value, 10);
            if (isNaN(id)) { this.showToast('ID inválido.', 'error'); return; }

            const found = this.fileSimulator.findById(id);
            if (!found) { this.showToast(`Registro #${id} não encontrado ou já excluído.`, 'error'); return; }

            this._openDeleteModal(id, found.record.nome);
        });
    }

    _openDeleteModal(id, nome) {
        this.pendingDeleteId = id;
        document.getElementById('modal-record-info').textContent = `"${nome}" (ID #${id})`;
        document.getElementById('confirm-modal').style.display   = 'flex';
        setTimeout(() => document.getElementById('btn-modal-cancel')?.focus(), 50);
    }

    _closeDeleteModal() {
        this.pendingDeleteId = null;
        document.getElementById('confirm-modal').style.display = 'none';
    }

    _initModal() {
        document.getElementById('btn-modal-cancel')?.addEventListener('click', () => this._closeDeleteModal());

        document.getElementById('btn-modal-confirm')?.addEventListener('click', () => {
            if (this.pendingDeleteId === null) return;
            const id = this.pendingDeleteId;
            const ok = this.fileSimulator.deleteRecord(id);
            this._closeDeleteModal();

            this.showToast(
                ok  ? `✓ Registro #${id} marcado como excluído (lápide = 1).`
                    : `Erro ao excluir o registro #${id}.`,
                ok ? 'success' : 'error'
            );

            if (ok) {
                const deleteInput = document.getElementById('delete-id');
                if (deleteInput) deleteInput.value = '';
            }

            this._clearSearchResults();
            this.clearHighlight();
            this.updateStatsDisplay();
            this.renderBytes();
        });

        document.getElementById('confirm-modal')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) this._closeDeleteModal();
        });

        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') this._closeDeleteModal();
        });
    }

    // ===========================================================
    // HIGHLIGHT
    // ===========================================================

    _applyHighlight(offsets) {
        this.highlightedOffsets = new Set(offsets);
        this.renderBytes();
    }

    _scheduleHighlight(recordOffset, dataSize) {
        const offsets = [];
        for (let i = recordOffset; i < recordOffset + 5 + dataSize; i++) offsets.push(i);
        this._applyHighlight(offsets);
    }

    clearHighlight() {
        if (this.highlightedOffsets.size > 0) {
            this.highlightedOffsets = new Set();
            this.renderBytes();
        }
    }

    // ===========================================================
    // RENDERIZAÇÃO DO VETOR DE BYTES
    // ===========================================================

    renderBytes() {
        const grid = document.getElementById('bytes-grid');
        if (!grid) return;

        const byteMap = this.fileSimulator.getByteMap();
        grid.innerHTML = '';

        if (byteMap.length === 0) {
            grid.innerHTML = `
                <div class="empty-state">
                    <svg width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1" class="text-muted">
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2"></rect>
                        <line x1="9" y1="3" x2="9" y2="21"></line>
                    </svg>
                    <p>O arquivo está vazio.</p>
                    <span class="text-sm text-muted">Cadastre um curso para começar a simulação.</span>
                </div>`;
            return;
        }

        const fragment = document.createDocumentFragment();

        byteMap.forEach(b => {
            const hex     = b.value.toString(16).padStart(2, '0').toUpperCase();
            const charStr = (b.value >= 32 && b.value <= 126) ? String.fromCharCode(b.value) : '.';

            const cell        = document.createElement('div');
            cell.className    = `byte-cell ${b.type}${this.highlightedOffsets.has(b.index) ? ' highlight' : ''}`;
            cell.textContent  = hex;
            cell.title        = `Offset: ${b.index} | Tipo: ${b.label} | Valor: ${b.value}`;

            cell.addEventListener('mouseenter', () => {
                document.getElementById('inspector-content').textContent =
                    `Offset: ${b.index} (0x${b.index.toString(16).toUpperCase().padStart(4, '0')})  |  Hex: 0x${hex}  |  Dec: ${b.value}  |  Char: '${charStr}'  |  Bloco: ${b.label}`;
            });
            cell.addEventListener('mouseleave', () => {
                document.getElementById('inspector-content').textContent = 'Aguardando interação...';
            });

            fragment.appendChild(cell);
        });

        grid.appendChild(fragment);

        // Rola até o primeiro byte destacado
        if (this.highlightedOffsets.size > 0) {
            const firstOffset = Math.min(...this.highlightedOffsets);
            const targetIndex = byteMap.findIndex(b => b.index === firstOffset);
            const cells       = grid.querySelectorAll('.byte-cell');
            if (targetIndex >= 0 && cells[targetIndex]) {
                cells[targetIndex].scrollIntoView({ behavior: 'smooth', block: 'center' });
            }
        }
    }

    // ===========================================================
    // ESTATÍSTICAS
    // ===========================================================

    updateStatsDisplay() {
        const el = (id) => document.getElementById(id);
        if (el('stat-size'))    el('stat-size').textContent    = `${this.fileSimulator.getSize()} B`;
        if (el('stat-records')) el('stat-records').textContent = `${this.fileSimulator.getHeader().lastId}`;
    }

    // ===========================================================
    // TOASTS
    // ===========================================================

    showToast(message, type = 'info', duration = 3500) {
        const container = document.getElementById('toast-container');
        if (!container) return;

        const icons = {
            success: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><polyline points="20 6 9 17 4 12"></polyline></svg>`,
            error:   `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="8" x2="12" y2="12"></line><line x1="12" y1="16" x2="12.01" y2="16"></line></svg>`,
            warning: `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><path d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"></path><line x1="12" y1="9" x2="12" y2="13"></line><line x1="12" y1="17" x2="12.01" y2="17"></line></svg>`,
            info:    `<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="16" x2="12" y2="12"></line><line x1="12" y1="8" x2="12.01" y2="8"></line></svg>`,
        };

        const toast       = document.createElement('div');
        toast.className   = `toast toast-${type}`;
        toast.innerHTML   = `<span class="toast-icon">${icons[type] || icons.info}</span><span>${message}</span>`;
        container.appendChild(toast);

        const remove = () => {
            toast.classList.add('toast-exit');
            toast.addEventListener('animationend', () => toast.remove(), { once: true });
        };
        const timer = setTimeout(remove, duration);
        toast.addEventListener('click', () => { clearTimeout(timer); remove(); });
    }
}

// Inicializa quando o DOM estiver pronto
document.addEventListener('DOMContentLoaded', () => {
    window.app = new App();
    console.log('App inicializado — FileSimulator aninhado em App.FileSimulator.');
});
