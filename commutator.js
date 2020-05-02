const START = 'START';
const END = 'END';
const GROUND = 'GROUND';
const POINT = 'POINT';
const OUT = 'OUT';
const DIRECT = 'DIRECT';
const SIGNAL = 'SIGNAL';
const SIGNAL_D = 'SIGNAL_D';
const SIGNAL_R = 'SIGNAL_R';

const BREAK = 'BREAK';
const GROUNDED = 'GROUNDED';

const body = document.body;

String.prototype.reverse = function() {
    if (this.length) {
        return this.split('').reverse().join('');
    }

    return this;
};

const triggerEvent = (element, event, data) => {
    const customEvent = new CustomEvent(event, { detail: data });
    element.dispatchEvent(customEvent);
}

class Device {
    constructor() {
        this.create();
    }

    create() {
        this.pins = [POINT, POINT];
        this.pinsStatus = [BREAK, BREAK];
        this.relations = this.buildRelations({
            '0_1': { from: 0, to: 1, type: DIRECT }
        });
        this.connections = [];
    }

    buildRelations(relations) {
        const result = {};

        for (let key in relations) {
            const current =  relations[key]
            result[key] = { ...current, sameKey: `${current.to}_${current.from}`, active: true };

            if (!relations[current.sameKey]) {
                result[result[key].sameKey] = { from: current.to, to: current.from, type: current.type, sameKey: key, active: true };
            }
        }

        return result;
    }

    getHtml(id) {
        return `
            <div id="device_${id}" class="device">
                <span data-id="0" data-type="${this.pins[0]}" data-status="${this.pinsStatus[0]}"></span>
                <span data-id="1" data-type="${this.pins[1]}" data-status="${this.pinsStatus[1]}"></span>
            </div>
        `;
    }
}

class Pickup extends Device {
    create() {
        this.pins = [START, END];
        this.pinsStatus = [BREAK, BREAK];
        this.relations = this.buildRelations({
            '0_1': { from: 0, to: 1, type: SIGNAL_D },
            '1_0': { from: 0, to: 1, type: SIGNAL_R },
        });
        this.connections = [];
    }

    getHtml(id) {
        return `
            <div id="device_${id}" class="pickup device" style="margin-top:${id * 80}px">
                <img src="pickup.png" alt="">
                <span data-id="0" data-type="${this.pins[0]}" data-status="${this.pinsStatus[0]}"></span>
                <span data-id="1" data-type="${this.pins[1]}" data-status="${this.pinsStatus[1]}"></span>
            </div>
        `;
    }
}

class Switcher extends Device {
    constructor() {
        super();
        this.setMode(0);
    }

    create() {
        this.pins = [POINT, POINT, POINT, POINT, POINT, POINT, POINT, POINT];
        this.pinsStatus = [BREAK, BREAK, BREAK, BREAK, BREAK, BREAK, BREAK, BREAK];
        this.relations = this.buildRelations({
            '0_2': { from: 0, to: 2, type: DIRECT },
            '2_4': { from: 2, to: 4, type: DIRECT },
            '4_6': { from: 4, to: 6, type: DIRECT },
            '1_3': { from: 1, to: 3, type: DIRECT },
            '3_5': { from: 3, to: 5, type: DIRECT },
            '5_7': { from: 5, to: 7, type: DIRECT }
        });
        this.connections = [];
        this.modeRelations = [['0_2', '1_3'], ['2_4', '3_5'], ['4_6', '5_7']]
    }

    setMode(mode) {
        for (let key in this.relations) {
            const current =  this.relations[key];
            current.active = false;
        }

        this.modeRelations[mode].forEach((value) => {
            this.relations[value].active = true;
            this.relations[this.relations[value].sameKey].active = true;
        })
    }

    getHtml(id) {
        return `
            <div id="device_${id}" class="switcher4 device" style="margin-top:${100}px">
                <img src="switcher4.png" alt="">
                <span data-id="0" data-type="${this.pins[0]}" data-status="${this.pinsStatus[0]}"></span>
                <span data-id="1" data-type="${this.pins[1]}" data-status="${this.pinsStatus[1]}"></span>
                <span data-id="2" data-type="${this.pins[2]}" data-status="${this.pinsStatus[2]}"></span>
                <span data-id="3" data-type="${this.pins[3]}" data-status="${this.pinsStatus[3]}"></span>
                <span data-id="4" data-type="${this.pins[4]}" data-status="${this.pinsStatus[4]}"></span>
                <span data-id="5" data-type="${this.pins[5]}" data-status="${this.pinsStatus[5]}"></span>
                <span data-id="6" data-type="${this.pins[6]}" data-status="${this.pinsStatus[6]}"></span>
                <span data-id="7" data-type="${this.pins[7]}" data-status="${this.pinsStatus[7]}"></span>
            </div>
        `;
    }
}

class Out extends Device {
    create() {
        this.pins = [OUT, GROUND];
        this.pinsStatus = [BREAK, GROUND];
        this.relations = this.buildRelations({
            '0_1': { from: 0, to: 1, type: OUT },
        });
        this.connections = [];
    }

    getHtml(id) {
        return `
            <div id="device_${id}" class="jack device">
                <img src="jack.png" alt="">
                <span data-id="0" data-type="${this.pins[0]}" data-status="${this.pinsStatus[0]}"></span>
                <span data-id="1" data-type="${this.pins[1]}" data-status="${this.pinsStatus[1]}"></span>
            </div>
        `;
    }
}

class Commutator {
    constructor() {
        this.devices = [];
        this.pinToDeviceMap = [];
    }

    traceGround(traceConnection) {
        const deviceIndex = traceConnection.toDeviceIndex;
        const pinIndex = traceConnection.toPinIndex;

        const device = this.devices[deviceIndex];
        const pins = [pinIndex];
        const connections = [];

        if (device.pinsStatus[pinIndex] === GROUNDED && traceConnection.fromDeviceIndex !== -1) return;

        device.pinsStatus[pinIndex] = GROUNDED;

        for (let key in device.relations) {
            const relation = device.relations[key];
            if (relation.from === pinIndex && relation.type === DIRECT && relation.active) pins.push(relation.to);
        }

        device.connections.forEach((connection) => {
            if (traceConnection.fromDeviceIndex === connection.toDeviceIndex)
                if (traceConnection.fromPinIndex === connection.toPinIndex) return;
            if (pins.includes(connection.fromPinIndex)) connections.push(connection);
        });

        connections.forEach((connection) => {
            this.drawWire(connection, '#ff00ff');
            this.traceGround(connection);
        });
    }

    traceSignal(traceConnection, signal) {
        const deviceIndex = traceConnection.toDeviceIndex;
        const pinIndex = traceConnection.toPinIndex;

        const device = this.devices[deviceIndex];
        const pins = [pinIndex];
        const connections = [];
        const signalConnections = [];
        const signalPins = {};

        if (traceConnection.fromDeviceIndex !== -1 && this.devices[traceConnection.fromDeviceIndex].pinsStatus[traceConnection.fromPinIndex] === GROUNDED)  {
            console.log(signal);

            return;
        }

        if (device.pinsStatus[pinIndex] === SIGNAL && traceConnection.fromDeviceIndex !== -1) {
           debugger;
        }

        if (device.pinsStatus[pinIndex] !== GROUNDED) device.pinsStatus[pinIndex] = SIGNAL;
        else return;

        if (traceConnection.fromDeviceIndex !== -1) {
            this.drawWire(traceConnection, '#0000ff');
        }

        for (let key in device.relations) {
            const relation = device.relations[key];
            const {from, to, type, active} = relation;

            if (from !== pinIndex) continue;
            if (!active) continue;

            if (type === DIRECT) pins.push(to);
            if (type === SIGNAL_D || type === SIGNAL_R) signalPins[to] = type;
        }

        device.connections.forEach((connection) => {
            if (traceConnection.fromDeviceIndex === connection.toDeviceIndex)
                if (traceConnection.fromPinIndex === connection.toPinIndex) return;

            if (pins.includes(connection.fromPinIndex)) connections.push(connection);

            if (signalPins[connection.fromPinIndex]) signalConnections.push({type: signalPins[connection.fromPinIndex], connection});
        });

        connections.forEach((connection) => {
            this.traceSignal(connection, signal.slice());
        });

        signalConnections.forEach((signalConnection) => {
            const { type, connection } = signalConnection;

            const { fromDeviceIndex } = connection;

            const newSignal = signal.slice();
            newSignal.push(`${fromDeviceIndex}_${type}`);

            this.traceSignal(connection, newSignal);
        });
    }

    addDevice(device) {
        this.devices.push(device)
        this.draw();
        this.pinToDeviceMap = this.createPinToDeviceMap(this.devices);
    }

    createPinToDeviceMap(devices) {
        const result = [];
 
        devices.forEach((device, deviceIndex) => {
            device.pins.forEach((pin, pinIndex) => {
                result.push({ deviceIndex: deviceIndex, pinIndex: pinIndex })
            })
        });

        triggerEvent(body, 'setPinsCount', result.length);

        return result;
    }

    settingConnections(connectionMatrix) {
        for (let i = 0; i < connectionMatrix.length; i++) {
            for (let j = i + 1; j < connectionMatrix[i].length; j++) {
                if (connectionMatrix[i][j]) {
                    this.createConnection(i, j);
                }
            }
        }
    }

    createConnection(i, j) {
        const device1 = this.devices[this.pinToDeviceMap[i].deviceIndex];
        const device2 = this.devices[this.pinToDeviceMap[j].deviceIndex];
        const pin1 = this.pinToDeviceMap[i].pinIndex;
        const pin2 = this.pinToDeviceMap[j].pinIndex;

        const connection1 = {
            fromDeviceIndex: this.pinToDeviceMap[i].deviceIndex,
            toDeviceIndex: this.pinToDeviceMap[j].deviceIndex,
            fromPinIndex: pin1,
            toPinIndex: pin2,
        }

        const connection2 = {
            fromDeviceIndex: this.pinToDeviceMap[j].deviceIndex,
            toDeviceIndex: this.pinToDeviceMap[i].deviceIndex,
            fromPinIndex: pin2,
            toPinIndex: pin1,
        }

        device1.connections.push(connection1);
        device2.connections.push(connection2);
    }

    buildMatrices() {
        // const matrix = [
        //     [0,0,0,0,0,0,0,0,0,0,0,1,0,0],
        //     [0,0,0,1,0,0,0,0,0,0,0,0,0,0],
        //     [0,0,0,0,0,0,0,0,0,0,1,0,0,0],
        //     [0,0,0,0,0,0,0,0,0,0,1,0,0,0],
        //     [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        //     [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        //     [0,0,0,0,0,0,0,0,0,0,0,1,0,0],
        //     [0,0,0,0,0,0,0,0,0,0,1,0,0,0],
        //     [0,0,0,0,0,0,0,0,0,0,0,0,1,0],
        //     [0,0,0,0,0,0,0,0,0,0,0,0,0,1],
        //     [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        //     [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        //     [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        //     [0,0,0,0,0,0,0,0,0,0,0,0,0,0],
        // ];

        const matrices = [];

        const variants = [];
        const mapLength = this.pinToDeviceMap.length;

        for (let i = 1; i < mapLength; i++) {
            const variant = this.getVectorVariants(mapLength - i, i);
            variants.push(variant);
        }

        let totalVariants = 1;

        variants.forEach((value) => {
            totalVariants *= value.length;
        });


    }

    buildMatrix() {

    }

    getVectorVariants(length, zeros = 0) {
        const result = [];
        const number = parseInt('1'.repeat(length), 2);

        for (let i = 0; i < number + 1; i++) {
            const variant = [];
            variant.length = length + zeros;
            variant.fill(0);
            const binary = (i >>> 0).toString(2).reverse();

            for (let j = 0; j < binary.length; j++) {
                variant[length + zeros - j - 1] = Number(binary[j]);
            }

            result.push(variant);
        }

        return result;
    }

    prepare() {
        this.connectionMatrix = this.buildMatrix();
        this.settingConnections(this.connectionMatrix);
    }

    draw() {
        const scheme = document.getElementById('scheme');
        let html = '';

        this.devices.forEach((device, index) => {
            html += device.getHtml(index);
        });

        scheme.innerHTML = html;
    }

    createWireElement(x1, y1, x2, y2, color = 'black') {
        const wire = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        wire.setAttribute('x1', x1);
        wire.setAttribute('y1', y1);
        wire.setAttribute('x2', x2);
        wire.setAttribute('y2', y2);
        wire.setAttribute('stroke', color);
        wire.setAttribute('stroke-width', '2px');

        return wire;
    }

    drawWire(connection, color = 'black') {
        window.setTimeout(() => {
            const wiring = document.getElementById('wiring');

            const fromDeviceElement = document.querySelector(`#device_${connection.fromDeviceIndex}`);
            const fromDeviceOffsetLeft = fromDeviceElement.offsetLeft;
            const fromDeviceOffsetTop = fromDeviceElement.offsetTop;

            const toDeviceElement = document.querySelector(`#device_${connection.toDeviceIndex}`);
            const toDeviceOffsetLeft = toDeviceElement.offsetLeft;
            const toDeviceOffsetTop = toDeviceElement.offsetTop;

            const fromPin = document.querySelector(`#device_${connection.fromDeviceIndex} span[data-id="${connection.fromPinIndex}"]`);
            const toPin = document.querySelector(`#device_${connection.toDeviceIndex} span[data-id="${connection.toPinIndex}"]`);

            const x = [fromPin.offsetLeft + fromDeviceOffsetLeft, toPin.offsetLeft + toDeviceOffsetLeft];
            const y = [fromPin.offsetTop + fromDeviceOffsetTop, toPin.offsetTop + toDeviceOffsetTop];

            wiring.append(this.createWireElement(x[0], y[0], x[1], y[1], color));
        }, 1000)
    }

    drawWiring() {
        const wiring = document.getElementById('wiring');

        window.setTimeout(() => {
            this.devices.forEach((device, index) => {
                const connections = device.connections;
                const fromDeviceElement = document.querySelector(`#device_${index}`);
                const fromDeviceOffsetLeft = fromDeviceElement.offsetLeft;
                const fromDeviceOffsetTop = fromDeviceElement.offsetTop;
    
                connections.forEach((connection) => {
                    const toDeviceElement = document.querySelector(`#device_${connection.toDeviceIndex}`);
                    const toDeviceOffsetLeft = toDeviceElement.offsetLeft;
                    const toDeviceOffsetTop = toDeviceElement.offsetTop;
    
                    const fromPin = document.querySelector(`#device_${connection.fromDeviceIndex} span[data-id="${connection.fromPinIndex}"]`);
                    const toPin = document.querySelector(`#device_${connection.toDeviceIndex} span[data-id="${connection.toPinIndex}"]`);

                    const x = [fromPin.offsetLeft + fromDeviceOffsetLeft, toPin.offsetLeft + toDeviceOffsetLeft];
                    const y = [fromPin.offsetTop + fromDeviceOffsetTop, toPin.offsetTop + toDeviceOffsetTop];

                    wiring.append(this.createWireElement(x[0], y[0], x[1], y[1], 'red'));
                });
            });
        }, 1000)
    }
}

const commutator = new Commutator;

// const switcher = new Switcher;
//
// switcher.setMode(2);
//
// commutator.addDevice(new Pickup);
// commutator.addDevice(new Pickup);
// commutator.addDevice(switcher);
// commutator.addDevice(new Out);
//
// commutator.buildMatrices();

//commutator.prepare();

// commutator.traceGround({
//     fromDeviceIndex: -1,
//     fromPinIndex: -1,
//     toDeviceIndex: 3,
//     toPinIndex: 1,
// });

// commutator.traceSignal({
//     fromDeviceIndex: -1,
//     fromPinIndex: -1,
//     toDeviceIndex: 3,
//     toPinIndex: 0,
// }, []);

// commutator.draw();
// commutator.drawWiring();
