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
        img.onload = function () {
            processImage(img);
        };
        img.src = reader.result;
    };

    reader.readAsDataURL(file);
});

function processImage(img) {
    document.getElementById("output").innerHTML = "<h2>検出中…</h2>";

    // OpenCV の処理を実行
    setTimeout(() => {
        const src = cv.imread(img);
        const template = cv.imread("template.png"); // P の見本画像を読み込む
        const dst = new cv.Mat();
        const mask = new cv.Mat();

        // テンプレートマッチング（類似度を計算）
        cv.matchTemplate(src, template, dst, cv.TM_CCOEFF_NORMED, mask);

        // 類似度が高い位置を検出
        const minMaxLoc = cv.minMaxLoc(dst, mask);
        const maxPoint = minMaxLoc.maxLoc; // 類似度が最大の座標
        const matchVal = minMaxLoc.maxVal; // 類似度の値（1.0に近いほど良い）

        console.log(`最大類似度: ${matchVal}, X=${maxPoint.x}, Y=${maxPoint.y}`);

        if (matchVal >= 0.7) { // 類似度が高い場合のみ P を認識
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

function extractPRegion(img, x, y) {
    const outputDiv = document.getElementById("output");
    outputDiv.innerHTML = "<h2>検出された P の候補</h2>";

    const selectedCoords = [];

    // P の周囲 50px を切り取る
    const croppedCanvas = document.createElement("canvas");
    const ctx = croppedCanvas.getContext("2d");

    const cropSize = 50;
    croppedCanvas.width = cropSize;
    croppedCanvas.height = cropSize;
    ctx.drawImage(img, x - cropSize / 2, y - cropSize / 2, cropSize, cropSize, 0, 0, cropSize, cropSize);

    // 画像を表示し、クリックで座標を取得
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
