
const fs = require('fs');

const data = fs.readFileSync('反転.mid');

function parseMidi(buffer) {
    let offset = 0;

    // Header Chunk
    const headerId = buffer.toString('ascii', 0, 4);
    if (headerId !== 'MThd') throw new Error('Invalid MIDI header');
    offset += 4;

    const headerLen = buffer.readUInt32BE(offset);
    offset += 4;

    const format = buffer.readUInt16BE(offset);
    offset += 2;
    const tracks = buffer.readUInt16BE(offset);
    offset += 2;
    const division = buffer.readUInt16BE(offset); // TPQN
    offset += 2;

    console.log(`Format: ${format}, Tracks: ${tracks}, Division: ${division}`);

    // Track Chunks
    for (let i = 0; i < tracks; i++) {
        const trackId = buffer.toString('ascii', offset, offset + 4);
        offset += 4;
        const trackLen = buffer.readUInt32BE(offset);
        offset += 4;

        console.log(`Track ${i} length: ${trackLen}`);

        let trackEnd = offset + trackLen;
        let currentTime = 0;
        let runningStatus = null;

        while (offset < trackEnd) {
            // Read Variable Length Quantity (Delta Time)
            let deltaTime = 0;
            let byte = buffer.readUInt8(offset++);
            deltaTime = (deltaTime << 7) | (byte & 0x7F);
            while (byte & 0x80) {
                byte = buffer.readUInt8(offset++);
                deltaTime = (deltaTime << 7) | (byte & 0x7F);
            }

            currentTime += deltaTime;

            // Event Type
            let status = buffer.readUInt8(offset);

            if (status & 0x80) {
                runningStatus = status;
                offset++;
            } else {
                status = runningStatus;
            }

            const type = status >> 4;
            const channel = status & 0x0F;

            if (type === 0x8) { // Note Off
                const note = buffer.readUInt8(offset++);
                const velocity = buffer.readUInt8(offset++);
                console.log(`Event: Note Off, Time: ${currentTime}, Note: ${note}`);
            } else if (type === 0x9) { // Note On
                const note = buffer.readUInt8(offset++);
                const velocity = buffer.readUInt8(offset++);
                if (velocity === 0) {
                    console.log(`Event: Note Off (vel0), Time: ${currentTime}, Note: ${note}`);
                } else {
                    console.log(`Event: Note On, Time: ${currentTime}, Note: ${note}`);
                }
            } else if (type === 0xF) {
                // Meta Event or Sysex
                if (status === 0xFF) {
                    const metaType = buffer.readUInt8(offset++);
                    // Read length
                    let len = 0;
                    byte = buffer.readUInt8(offset++);
                    len = (len << 7) | (byte & 0x7F);
                    while (byte & 0x80) {
                        byte = buffer.readUInt8(offset++);
                        len = (len << 7) | (byte & 0x7F);
                    }
                    console.log(`Event: Meta ${metaType.toString(16)}, Time: ${currentTime}, Len: ${len}`);
                    offset += len;
                } else {
                    // Sysex F0/F7... skip for now simply
                    // This simple parser might break on complex sysex but for simple files ok
                    console.log("Sysex skip attempt");
                }
            } else if (type === 0xC || type === 0xD) {
                // PC or Channel Pressure (1 byte)
                offset++;
            } else {
                // Control Change, Pitch Bend etc (2 bytes)
                offset += 2;
            }
        }
    }
}

try {
    parseMidi(data);
} catch (e) {
    console.error(e);
}
