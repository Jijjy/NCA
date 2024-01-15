(async function () {

    const cvs = document.querySelector('canvas'),
        width = cvs.width = 256,
        height = cvs.height = 256,
        gl = cvs.getContext('webgl2');

    // random with normal as opposed to uniform distribution
    // seems to give better kernels
    function randn() {
        return Math.sqrt(-2.0 * Math.log(Math.random())) * Math.cos(2.0 * Math.PI * Math.random());
    }

    var ext = gl.getExtension('EXT_color_buffer_float');
    if (!ext) {
        throw '32-bit floating point texture not supported';
    }

    const vs = gl.createShader(gl.VERTEX_SHADER);
    gl.shaderSource(vs, (await fetch('shaders/vert.glsl').then(r => r.text())).trim());
    gl.compileShader(vs);

    const fs = gl.createShader(gl.FRAGMENT_SHADER);
    gl.shaderSource(fs, (await fetch('shaders/frag.glsl').then(r => r.text())).trim());
    gl.compileShader(fs);

    if (!gl.getShaderParameter(fs, gl.COMPILE_STATUS))
        console.warn(gl.getShaderInfoLog(fs));

    var program = gl.createProgram();
    gl.attachShader(program, vs);
    gl.attachShader(program, fs);
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

    var lTime = gl.getUniformLocation(program, 'time');
    var lRez = gl.getUniformLocation(program, 'rez');
    var lRenderMode = gl.getUniformLocation(program, 'renderMode');
    var uTex = gl.getUniformLocation(program, 'uTex');

    const kernelInputs = [...document.querySelectorAll('#kernel input')];
    let kernel = [];
    for (let i = 0; i < 9; i++) {
        kernel.push({
            L: gl.getUniformLocation(program, `u_kernel[${i}]`),
            get value() { return parseFloat(kernelInputs[i].value); },
            set value(v) { kernelInputs[i].value = v.toFixed(3); },
            set() { gl.uniform1f(this.L, this.value); }
        })
    }

    function randomizeTexture() {
        var data = new Float32Array(width * height * 4);
        for (let i = 0; i < data.length; i++)
            data[i] = 1 - 2 * Math.random();
        gl.bindTexture(gl.TEXTURE_2D, tex1);
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA32F, width, height, 0, gl.RGBA, gl.FLOAT, data);
    }

    function randomizeKernel() {
        kernel.forEach(k => k.value = randn());
    }

    randomizeKernel();
    setInterval(() => {
        randomizeTexture();
        randomizeKernel();
    }, 5000);

    (function render() {
        var time = performance.now() * 0.001;
        gl.uniform1f(lTime, time);
        gl.uniform2f(lRez, width, height);
        gl.uniform1i(lRenderMode, 0);
        kernel.forEach(k => k.set());

        gl.activeTexture(gl.TEXTURE0);
        gl.bindTexture(gl.TEXTURE_2D, tex1);
        gl.uniform1i(uTex, 0);

        gl.bindFramebuffer(gl.FRAMEBUFFER, fb);
        gl.framebufferTexture2D(gl.FRAMEBUFFER, gl.COLOR_ATTACHMENT0, gl.TEXTURE_2D, tex2, 0);
        gl.drawArrays(gl.TRIANGLES, 0, 3);
        gl.bindFramebuffer(gl.FRAMEBUFFER, null);

        gl.uniform1i(lRenderMode, 1);
        gl.bindTexture(gl.TEXTURE_2D, tex2);
        gl.drawArrays(gl.TRIANGLES, 0, 3);

        [tex1, tex2] = [tex2, tex1];

        requestAnimationFrame(render);
    })();
})();
