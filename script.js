(async function () {

    // random with normal as opposed to uniform distribution
    // seems to give better kernels
    function randn() {
        return Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random());
    }

    const Q = t => document.querySelector(t),
        QQ = t => document.querySelectorAll(t);

    const activationFunctions = await fetch('activation-functions.json').then(r => r.json()),
        vertSrc = (await fetch('shaders/vert.glsl').then(r => r.text())).trim(),
        fragSrc = (await fetch('shaders/frag.glsl').then(r => r.text())).trim();

    const cvs = Q('canvas'),
        width = cvs.width = 256,
        height = cvs.height = 256,
        gl = cvs.getContext('webgl2'),
        program = gl.createProgram();

    if (!gl.getExtension('EXT_color_buffer_float')) {
        document.body.innerHTML = '32-bit floating point texture not supported';
        return;
    }

    function setShader(src, type) {
        const s = gl.createShader(type);
        gl.shaderSource(s, src);
        gl.compileShader(s);
        if (!gl.getShaderParameter(s, gl.COMPILE_STATUS)) {
            Q('#error').innerHTML = gl.getShaderInfoLog(s);
            gl.deleteShader(s);
            return;
        }
        Q('#error').innerHTML = '';

        gl.getAttachedShaders(program).forEach(t => {
            if (gl.getShaderParameter(t, gl.SHADER_TYPE) === type) {
                gl.detachShader(program, t);
                gl.deleteShader(t);
            }
        });

        gl.attachShader(program, s);
    }

    Object.keys(activationFunctions).forEach(af => {
        Q('#sel-af').innerHTML += `<option>${af}</option>`;
    });

    Q('#txt-af-src').innerHTML = activationFunctions['tanh'];
    Q('#txt-af-src').addEventListener('change', e => {
        setShader(fragSrc.replace('#ACTIVATION#', e.target.value), gl.FRAGMENT_SHADER);
        gl.linkProgram(program);
        gl.useProgram(program);
    });

    Q('#sel-af').addEventListener('change', e => {
        Q('#txt-af-src').innerHTML = activationFunctions[e.target.value];
    });

    setShader(vertSrc, gl.VERTEX_SHADER);
    setShader(fragSrc.replace('#ACTIVATION#', activationFunctions.tanh), gl.FRAGMENT_SHADER);
    gl.linkProgram(program);
    gl.useProgram(program);

    var buffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buffer);
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1, -1, -1, 3, 3, -1]), gl.STATIC_DRAW);

    var pL = gl.getAttribLocation(program, 'position');
    gl.enableVertexAttribArray(pL);
    gl.vertexAttribPointer(pL, 2, gl.FLOAT, false, 0, 0);

    function createTexture() {
        var tex = gl.createTexture();
        gl.bindTexture(gl.TEXTURE_2D, tex);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.REPEAT);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
        gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, null);
        return tex;
    }

    var tex1 = createTexture();
    var tex2 = createTexture();

    var fb = gl.createFramebuffer();
    gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
    gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex1, 0);

    class Uniform {
        constructor(name, setter) { this.name = name; this._set = setter; }
        set(v) {
            if (v || v === 0) this.value = v;
            this._set(gl.getUniformLocation(program, this.name), this.value);
        }
    }

    const setters = {
        f: (l, v) => gl.uniform1f(l, v),
        i: (l, v) => gl.uniform1i(l, v),
        vec2: (l, v) => gl.uniform2f(l, ...v),
    };

    const uniforms = {
        rez: new Uniform('rez', setters.vec2),
        renderMode: new Uniform('renderMode', setters.i),
        tex: new Uniform('uTex', setters.i),
    };

    const kernelInputs = [...document.querySelectorAll('#kernel input')];
    let kernel = [];
    for (let i = 0; i < 9; i++) {
        kernel.push(new Uniform(`u_kernel[${i}]`, setters.f))
    }

    function randomizeTexture() {
        var data = new Float32Array(width * height * 4);
        for (let i = 0; i < data.length; i++)
            data[i] = randn();
        gl.bindTexture(gl.TEXTURE_2D, tex1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, data);
    }

    function randomizeKernel() {
        kernel.forEach((k, i) => kernelInputs[i].value = randn().toFixed(3));
    }

    randomizeKernel();
    setInterval(() => {
        randomizeTexture();
        randomizeKernel();
    }, 5000);

    (function render() {
        uniforms.rez.set([width, height]);
        uniforms.renderMode.set(0);
        kernel.forEach((k, i) => k.set(parseFloat(kernelInputs[i].value)));

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex1);
        uniforms.tex.set(0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex2, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        uniforms.renderMode.set(1);
        gl.bindTexture(gl.TEXTURE_2D, tex2);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        [tex1, tex2] = [tex2, tex1];

        requestAnimationFrame(render);
    })();
})();
