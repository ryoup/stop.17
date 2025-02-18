document.getElementById("uploadForm").addEventListener("submit", function (e) {
    e.preventDefault(); // ページリロードを防止

    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) {
        document.getElementById("output").innerHTML = `<p style="color: red;">画像を選択してください。</p>`;
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function () {
        const img = new Image();
        img.src = reader.result;
        img.onload = function () {
            console.log("画像のロード完了、解析を開始します");
            processImage(img);
        };
    };

    reader.readAsDataURL(file);
});

function processImage(img) {
    document.getElementById("output").innerHTML = "<h2>検出中…</h2>";

    setTimeout(() => {
        // **キャンバスを作成して画像を描画**
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // **OpenCV.js の画像データに変換**
        const src = cv.imread(canvas); // `cv.imread()` には `<canvas>` を渡す

        // **テンプレート画像の読み込み**
        const templateImg = new Image();
        templateImg.src = "template.png"; // 事前に template.png を用意
        templateImg.onload = function () {
            const templateCanvas = document.createElement("canvas");
            const templateCtx = templateCanvas.getContext("2d");
            templateCanvas.width = templateImg.width;
            templateCanvas.height = templateImg.height;
            templateCtx.drawImage(templateImg, 0, 0, templateImg.width, templateImg.height);

            const template = cv.imread(templateCanvas); // `cv.imread()` には `<canvas>` を渡す

            const dst = new cv.Mat();
            const mask = new cv.Mat();

            // **テンプレートマッチング（類似度を計算）**
            cv.matchTemplate(src, template, dst, cv.TM_CCOEFF_NORMED, mask);

            // **類似度が高い位置を検出**
            const minMaxLoc = cv.minMaxLoc(dst, mask);
            const maxPoint = minMaxLoc.maxLoc; // 類似度が最大の座標
            const matchVal = minMaxLoc.maxVal; // 類似度の値（1.0に近いほど良い）

            console.log(`最大類似度: ${matchVal}, X=${maxPoint.x}, Y=${maxPoint.y}`);

            if (matchVal >= 0.7) { // **類似度が高い場合のみ P を認識**
                extractPRegion(img, maxPoint.x, maxPoint.y);
            } else {
                document.getElementById("output").innerHTML = "<p style='color: red;'>P が見つかりませんでした。</p>";
            }

            src.delete();
            template.delete();
            dst.delete();
            mask.delete();
        };
    }, 500);
}

function extractPRegion(img, x, y) {
    const outputDiv = document.getElementById("output");
    outputDiv.innerHTML = "<h2>検出された P の候補</h2>";

    const selectedCoords = [];

    // **P の周囲 50px を切り取る**
    const croppedCanvas = document.createElement("canvas");
    const ctx = croppedCanvas.getContext("2d");

    const cropSize = 50;
    croppedCanvas.width = cropSize;
    croppedCanvas.height = cropSize;
    ctx.drawImage(img, x - cropSize / 2, y - cropSize / 2, cropSize, cropSize, 0, 0, cropSize, cropSize);

    // **画像を表示し、クリックで座標を取得**
    const imgElement = document.createElement("img");
    imgElement.src = croppedCanvas.toDataURL();
    imgElement.className = "result-img";
    imgElement.onclick = function () {
        selectedCoords.push({ x, y });
        updateSelectedCoords(selectedCoords);
    };

    outputDiv.appendChild(imgElement);
}

function updateSelectedCoords(coords) {
    const selectedDiv = document.getElementById("selectedCoords");
    selectedDiv.innerHTML = "<h3>選択した P の座標:</h3>" + coords.map(c => `<p>X: ${c.x}, Y: ${c.y}</p>`).join("");
}
