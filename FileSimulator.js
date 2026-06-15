export class FileSimulator {
    constructor(storageKey = 'binary_file_sim') {
        this.storageKey = storageKey;
        this.buffer = new Uint8Array(0);
        this.load();

        if (this.buffer.length === 0) {
            this.initHeader();
        }
    }

    // ==========================================
    // PERSISTÊNCIA NO LOCALSTORAGE
    // ==========================================

    load() {
        const data = localStorage.getItem(this.storageKey);
        if (data) {
            try {
                // Decodifica de Base64 para Uint8Array
                const binary_string = window.atob(data);
                const len = binary_string.length;
                this.buffer = new Uint8Array(len);
                for (let i = 0; i < len; i++) {
                    this.buffer[i] = binary_string.charCodeAt(i);
                }
            } catch (e) {
                console.error("Erro ao carregar os dados:", e);
                this.buffer = new Uint8Array(0);
            }
        } else {
            this.buffer = new Uint8Array(0);
        }
    }

    save() {
        // Codifica Uint8Array para Base64 para armazenar
        let binary = '';
        const len = this.buffer.byteLength;
        for (let i = 0; i < len; i++) {
            binary += String.fromCharCode(this.buffer[i]);
        }
        localStorage.setItem(this.storageKey, window.btoa(binary));
    }

    // ==========================================
    // GERENCIAMENTO DO VETOR
    // ==========================================

    getSize() {
        return this.buffer.length;
    }

    expand(bytes) {
        const newBuffer = new Uint8Array(this.buffer.length + bytes);
        newBuffer.set(this.buffer);
        this.buffer = newBuffer;
    }

    // ==========================================
    // LEITURA E ESCRITA DE TIPOS PRIMITIVOS
    // ==========================================

    writeByte(offset, value) {
        this.buffer[offset] = value;
    }

    readByte(offset) {
        return this.buffer[offset];
    }

    writeInt(offset, value) {
        const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
        view.setInt32(offset, value, true); // little-endian
    }

    readInt(offset) {
        const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
        return view.getInt32(offset, true);
    }

    writeFloat(offset, value) {
        const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
        view.setFloat32(offset, value, true); // little-endian
    }

    readFloat(offset) {
        const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
        return view.getFloat32(offset, true);
    }

    writeString(offset, str) {
        const encoder = new TextEncoder();
        const strBytes = encoder.encode(str);
        
        // Tamanho da string (2 bytes)
        const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
        view.setInt16(offset, strBytes.length, true);
        
        // Bytes da string
        this.buffer.set(strBytes, offset + 2);
        
        return 2 + strBytes.length; // Retorna a quantidade de bytes que ocupou
    }

    readString(offset) {
        const view = new DataView(this.buffer.buffer, this.buffer.byteOffset, this.buffer.byteLength);
        const len = view.getInt16(offset, true);
        
        const decoder = new TextDecoder();
        const strBytes = this.buffer.slice(offset + 2, offset + 2 + len);
        const str = decoder.decode(strBytes);
        
        return { value: str, bytesRead: 2 + len };
    }

    // ==========================================
    // ESTRUTURA DO CABEÇALHO
    // ==========================================
    // Offset 0 (4 bytes): Número de registros / Último ID gerado
    // Offset 4 (4 bytes): Ponteiro (offset) para a cabeça da lista de excluídos (-1 se vazia)

    initHeader() {
        this.expand(8);
        this.writeInt(0, 0);  // Last ID
        this.writeInt(4, -1); // Lista de excluídos
        this.save();
    }

    getHeader() {
        return {
            lastId: this.readInt(0),
            deletedHead: this.readInt(4)
        };
    }

    setHeader(lastId, deletedHead) {
        this.writeInt(0, lastId);
        this.writeInt(4, deletedHead);
        this.save();
    }

    // ==========================================
    // CODIFICAÇÃO/DECODIFICAÇÃO DE REGISTROS
    // ==========================================
    
    // Calcula quantos bytes o registro vai ocupar (apenas os dados, sem lápide e sem indicador de tamanho do registro)
    calculateRecordDataSize(id, nome, preco, quantidade, categoria) {
        let size = 0;
        const encoder = new TextEncoder();
        
        size += 4; // ID (int)
        size += 2 + encoder.encode(nome).length; // Nome (string)
        size += 2 + encoder.encode(categoria).length; // Categoria (string)
        size += 4; // Quantidade (int)
        size += 4; // Preço (float)
        
        return size;
    }

    // Constrói e retorna um Uint8Array apenas com os dados do registro
    encodeRecordData(id, nome, preco, quantidade, categoria) {
        const size = this.calculateRecordDataSize(id, nome, preco, quantidade, categoria);
        const tempBuffer = new Uint8Array(size);
        const tempSim = { buffer: tempBuffer, writeInt: this.writeInt, writeFloat: this.writeFloat, writeString: this.writeString };
        
        // Como o writeInt etc. operam no `this.buffer`, vamos sobrescrevê-los temporariamente 
        // ou escrever uma lógica local. Melhor escrevermos no this.buffer expandido.
        
        return { size, id, nome, preco, quantidade, categoria };
    }

    // Reutiliza espaço ou anexa no final
    insertRecord(nome, preco, quantidade, categoria) {
        const header = this.getHeader();
        const newId = header.lastId + 1;
        const requiredDataSize = this.calculateRecordDataSize(newId, nome, preco, quantidade, categoria);
        
        let prevDeletedOffset = -1;
        let currDeletedOffset = header.deletedHead;
        let foundOffset = -1;
        let blockDataSize = 0;
        let nextOfFound = -1;
        
        // Busca First-Fit
        while (currDeletedOffset !== -1) {
            const size = this.readInt(currDeletedOffset + 1);
            const nextDeleted = this.readInt(currDeletedOffset + 5);
            
            if (size >= requiredDataSize) {
                foundOffset = currDeletedOffset;
                blockDataSize = size;
                nextOfFound = nextDeleted;
                break;
            }
            
            prevDeletedOffset = currDeletedOffset;
            currDeletedOffset = nextDeleted;
        }
        
        if (foundOffset !== -1) {
            // Reutiliza o bloco
            if (prevDeletedOffset === -1) {
                this.setHeader(newId, nextOfFound);
            } else {
                this.writeInt(prevDeletedOffset + 5, nextOfFound);
                this.setHeader(newId, header.deletedHead);
            }
            
            this.writeByte(foundOffset, 0); // Lápide = ativo
            this.writeRecordData(foundOffset + 5, newId, nome, preco, quantidade, categoria);
            this.save();
            return newId;
        } else {
            return this.appendRecord(nome, preco, quantidade, categoria);
        }
    }

    // Adiciona o registro fisicamente no final do arquivo
    appendRecord(nome, preco, quantidade, categoria) {
        const header = this.getHeader();
        const newId = header.lastId + 1;
        
        const dataSize = this.calculateRecordDataSize(newId, nome, preco, quantidade, categoria);
        
        const totalRecordSize = 1 + 4 + dataSize;
        const offset = this.getSize();
        
        this.expand(totalRecordSize);
        
        // 1. Escreve a Lápide (0 = ativo)
        this.writeByte(offset, 0);
        
        // 2. Escreve o Tamanho do registro
        this.writeInt(offset + 1, dataSize);
        
        // 3. Escreve os Campos
        this.writeRecordData(offset + 5, newId, nome, preco, quantidade, categoria);
        
        // Atualiza cabeçalho com novo ID
        this.setHeader(newId, header.deletedHead);
        
        this.save();
        
        return newId;
    }

    writeRecordData(offset, id, nome, preco, quantidade, categoria) {
        let currentOffset = offset;
        
        // ID (int)
        this.writeInt(currentOffset, id);
        currentOffset += 4;
        
        // Nome (string)
        currentOffset += this.writeString(currentOffset, nome);
        
        // Categoria (string)
        currentOffset += this.writeString(currentOffset, categoria);
        
        // Quantidade (int)
        this.writeInt(currentOffset, quantidade);
        currentOffset += 4;
        
        // Preço (float)
        this.writeFloat(currentOffset, preco);
        currentOffset += 4;
    }

    // Função auxiliar para varrer e mapear cada byte para o visualizador
    getByteMap() {
        const map = [];
        const size = this.getSize();
        
        // 0-7: Header
        for(let i = 0; i < 8; i++) {
            if(i < size) map.push({ index: i, value: this.readByte(i), type: 'bg-header', label: 'Cabeçalho' });
        }
        
        let offset = 8;
        while(offset < size) {
            const tombstone = this.readByte(offset);
            const dataSize = this.readInt(offset + 1);
            
            // Tombstone
            map.push({ index: offset, value: tombstone, type: tombstone === 0 ? 'bg-tombstone-active' : 'bg-tombstone-deleted', label: 'Lápide' });
            
            // Size
            for(let i = 0; i < 4; i++) {
                map.push({ index: offset + 1 + i, value: this.readByte(offset + 1 + i), type: 'bg-size', label: 'Tamanho' });
            }
            
            let dataOffset = offset + 5;
            
            if (tombstone === 0) {
                // Ativo: Lemos os campos
                // ID
                for(let i=0; i<4; i++) map.push({ index: dataOffset++, value: this.readByte(dataOffset-1), type: 'bg-id', label: 'ID' });
                
                // Nome
                const nomeLen = this.readInt(dataOffset) & 0xFFFF; // ler 2 bytes é getInt16, usando readByte manual p n mudar o cursor 
                // Ops, eu posso só usar readString. E contar quantos bytes ocupou
                const nomeStr = this.readString(dataOffset);
                for(let i=0; i<nomeStr.bytesRead; i++) map.push({ index: dataOffset++, value: this.readByte(dataOffset-1), type: 'bg-name', label: 'Nome' });
                
                // Categoria
                const catStr = this.readString(dataOffset);
                for(let i=0; i<catStr.bytesRead; i++) map.push({ index: dataOffset++, value: this.readByte(dataOffset-1), type: 'bg-instructor', label: 'Categoria' });
                
                // Quantidade
                for(let i=0; i<4; i++) map.push({ index: dataOffset++, value: this.readByte(dataOffset-1), type: 'bg-capacity', label: 'Quantidade' });
                
                // Preço
                for(let i=0; i<4; i++) map.push({ index: dataOffset++, value: this.readByte(dataOffset-1), type: 'bg-price', label: 'Preço' });
                
                // Preencher o lixo/fragmentação se houver
                while(dataOffset < offset + 5 + dataSize) {
                    map.push({ index: dataOffset++, value: this.readByte(dataOffset-1), type: 'bg-tombstone-deleted', label: 'Lixo (Fragmentação)' });
                }
            } else {
                // Excluído: Tem o ponteiro (4 bytes) e o resto é lixo
                for(let i=0; i<4; i++) map.push({ index: dataOffset++, value: this.readByte(dataOffset-1), type: 'bg-id', label: 'Ponteiro Prox. Excluído' });
                while(dataOffset < offset + 5 + dataSize) {
                    map.push({ index: dataOffset++, value: this.readByte(dataOffset-1), type: 'bg-tombstone-deleted', label: 'Lixo (Excluído)' });
                }
            }
            
            offset += 5 + dataSize;
        }
        
        return map;
    }
}
