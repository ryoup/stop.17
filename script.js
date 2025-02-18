document.getElementById("uploadForm").addEventListener("submit", function(e) {
    e.preventDefault();

    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) {
        document.getElementById("result").innerHTML = `<p style="color:red;">画像を選択してください。</p>`;
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function(event) {
        const imageDataUrl = event.target.result;

        const img = new Image();
        img.src = imageDataUrl;
        img.onload = function() {
            processImage(img);
        };
    };

    reader.readAsDataURL(file);
});

function processImage(img) {
    console.log("🖼️ 画像処理開始");

    // 画像の描画
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);

    // `jsfeat` を使ってグレースケール & Canny エッジ検出
    let imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let grayImg = new jsfeat.matrix_t(canvas.width, canvas.height, jsfeat.U8C1_t);
    let edgeImg = new jsfeat.matrix_t(canvas.width, canvas.height, jsfeat.U8C1_t);
    
    jsfeat.imgproc.grayscale(imageData.data, canvas.width, canvas.height, grayImg);
    jsfeat.imgproc.canny(grayImg, edgeImg, 20, 50); // Canny エッジ検出

    // canvas にエッジ画像を描画
    let edgeData = ctx.getImageData(0, 0, canvas.width, canvas.height);
    let i = edgeImg.cols * edgeImg.rows;
    while (--i >= 0) {
        let pix = edgeImg.data[i];
        edgeData.data[i * 4] = pix;
        edgeData.data[i * 4 + 1] = pix;
        edgeData.data[i * 4 + 2] = pix;
        edgeData.data[i * 4 + 3] = 255; // 透明度を固定
    }
    ctx.putImageData(edgeData, 0, 0);

    // Pの候補領域を検出
    let resultHTML = `<h2>解析結果</h2>`;
    let detectedP = 0;
    const minSize = 30; // 小さなノイズを除外
    const contours = detectContours(edgeImg);

    contours.forEach((rect, idx) => {
        if (rect.width > minSize && rect.height > minSize) {
            const roiCanvas = document.createElement("canvas");
            const roiCtx = roiCanvas.getContext("2d");
            roiCanvas.width = rect.width;
            roiCanvas.height = rect.height;
            roiCtx.drawImage(img, rect.x, rect.y, rect.width, rect.height, 0, 0, rect.width, rect.height);

            detectedP++;
            resultHTML += `<div>
                              <p>P${detectedP}: 位置 (x: ${rect.x}, y: ${rect.y})</p>
                              <img src="${roiCanvas.toDataURL()}" alt="P cutout">
                           </div>`;
        }
    });

    if (detectedP === 0) {
        resultHTML = `<p style="color:red;">P が検出されませんでした。</p>`;
    }

    document.getElementById("result").innerHTML = resultHTML;
}

// 輪郭検出（簡易版）
function detectContours(edgeImg) {
    let contours = [];
    for (let y = 0; y < edgeImg.rows; y++) {
        for (let x = 0; x < edgeImg.cols; x++) {
            if (edgeImg.data[y * edgeImg.cols + x] > 0) { // エッジがある領域
                let rect = floodFill(edgeImg, x, y);
                if (rect) contours.push(rect);
            }
        }
    }
    return contours;
}

// 簡易 Flood Fill（塗りつぶし）でバウンディングボックスを取得
function floodFill(edgeImg, startX, startY) {
    const stack = [[startX, startY]];
    let minX = startX, maxX = startX, minY = startY, maxY = startY;
    const width = edgeImg.cols, height = edgeImg.rows;

    while (stack.length > 0) {
        const [x, y] = stack.pop();
        if (x < 0 || y < 0 || x >= width || y >= height) continue;
        if (edgeImg.data[y * width + x] === 0) continue;

        edgeImg.data[y * width + x] = 0; // 塗りつぶし

        minX = Math.min(minX, x);
        maxX = Math.max(maxX, x);
        minY = Math.min(minY, y);
        maxY = Math.max(maxY, y);

        stack.push([x - 1, y], [x + 1, y], [x, y - 1], [x, y + 1]);
    }

    if (maxX - minX > 5 && maxY - minY > 5) { // 小さなノイズを除外
        return { x: minX, y: minY, width: maxX - minX, height: maxY - minY };
    }
    return null;
}
