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
        img.onload = async function () {
            console.log("画像のロード完了、解析を開始します");

            // **テンプレート画像を fetch() でロード**
            const templateImg = await loadTemplateImage("template.png");

            // **OpenCV で解析開始**
            processImage(img, templateImg);
        };
    };

    reader.readAsDataURL(file);
});

/**
 * `fetch()` を使って CORS 制限を回避しながらテンプレート画像を取得
 */
async function loadTemplateImage(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("テンプレート画像の取得に失敗しました");

        const blob = await response.blob();
        const img = new Image();
        img.src = URL.createObjectURL(blob);

        return new Promise((resolve) => {
            img.onload = () => resolve(img);
        });
    } catch (error) {
        console.error("❌ テンプレート画像のロードエラー:", error);
    }
}

/**
 * OpenCV.js で画像処理を実行
 */
function processImage(img, templateImg) {
    document.getElementById("output").innerHTML = "<h2>検出中…</h2>";

    setTimeout(() => {
        // **画像を `<canvas>` に描画**
        const canvas = document.createElement("canvas");
        const ctx = canvas.getContext("2d");
        canvas.width = img.width;
        canvas.height = img.height;
        ctx.drawImage(img, 0, 0, img.width, img.height);

        // **OpenCV.js の画像データに変換**
        const src = cv.imread(canvas);

        // **テンプレート画像の処理**
        const templateCanvas = document.createElement("canvas");
        const templateCtx = templateCanvas.getContext("2d");
        templateCanvas.width = templateImg.width;
        templateCanvas.height = templateImg.height;
        templateCtx.drawImage(templateImg, 0, 0, templateImg.width, templateImg.height);

        const template = cv.imread(templateCanvas); // `cv.imread()` に `<canvas>` を渡す

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
    }, 500);
}

/**
 * 検出した P の周囲をクロップして表示
 */
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

/**
 * ユーザーが選択した P の座標を表示
 */
function updateSelectedCoords(coords) {
    const selectedDiv = document.getElementById("selectedCoords");
    selectedDiv.innerHTML = "<h3>選択した P の座標:</h3>" + coords.map(c => `<p>X: ${c.x}, Y: ${c.y}</p>`).join("");
}
