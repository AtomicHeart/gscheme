console.log(commutator);

controls = document.getElementById('controls');

controls.addEventListener('click', (ev) => {
    switch (ev.target.value) {
        case 'pickup': commutator.addDevice(new Pickup); break;
        case 'out': commutator.addDevice(new Out); break;
        case 'switcher4':
            const switcher4 = new Switcher;
            switcher4.setMode(2);
            commutator.addDevice(switcher4);
            break;
        default: break;
    }
});

const calcVariantsCount = (pinsCount) => {
    const variants = [];

    for (let i = 1; i < pinsCount; i++) {
        const variant = commutator.getVectorVariants(pinsCount - i, i);
        variants.push(variant);
    }

    let totalVariants = 1;

    variants.forEach((value) => {
        totalVariants *= value.length;
    });

    console.log(variants);

    const matrices = document.getElementById('matrices');

    if (variants.length === 3) {
        for (let i = 0; i < 8; i++) {
            const matrix = [variants[0][i]];

            for (let j = 0; j < 4; j++) {
                const matrix2 = matrix.slice();
                matrix2.push(variants[1][j]);

                for (let k = 0; k < 2; k++) {
                    const matrix3 = matrix2.slice();

                    matrix3.push(variants[2][k]);
                    matrix3.push([0,0,0,0]);

                    let markup = '';
                    matrix3.forEach((vector) => {
                        markup += vector.join(', ') + '<br/>';
                    })

                    const element = document.createElement('div');

                    element.innerHTML = markup;

                    matrices.append(element);
                }
            }
        }
    }

    return totalVariants;
}

body.addEventListener('setPinsCount', (ev) => {
    const pinsCountElement = document.getElementsByClassName('js-pins-count')[0];
    const variantsCountElement = document.getElementsByClassName('js-variants-count')[0];
    pinsCountElement.innerText = ev.detail;
    variantsCountElement.innerText = calcVariantsCount(Number(ev.detail));
});
