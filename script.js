document.getElementById("uploadForm").addEventListener("submit", function(e) {
    e.preventDefault(); // ページリロードを防止

    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) {
        document.getElementById("output").innerHTML = `<p style="color: red;">画像を選択してください。</p>`;
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = function() {
        const img = new Image();
        img.onload = function() {
            preprocessImage(img); // 画像の前処理を実行
        };
        img.src = reader.result;
    };

    reader.readAsDataURL(file);
});

// ** 画像の前処理（グレースケール＆コントラスト調整）**
function preprocessImage(img) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);

    // グレースケール変換
    const imageData = ctx.getImageData(0, 0, img.width, img.height);
    const data = imageData.data;

    for (let i = 0; i < data.length; i += 4) {
        const gray = data[i] * 0.3 + data[i + 1] * 0.59 + data[i + 2] * 0.11;
        data[i] = gray;      // R
        data[i + 1] = gray;  // G
        data[i + 2] = gray;  // B
    }

    ctx.putImageData(imageData, 0, 0);

    // OCRの実行
    processImage(canvas);
}

function processImage(canvas) {
    const outputDiv = document.getElementById("output");
    outputDiv.innerHTML = `<h2>検出中…</h2>`;  // 検出中の表示

    // OCR で P の座標を取得（精度を甘くする）
    Tesseract.recognize(canvas, "ocrb", {  // `ocrb` で精度向上
        logger: m => console.log(m),
        tessedit_char_whitelist: "PpFBR" // 「P」に似た文字も許可
    }).then(({ data: { words } }) => {
        outputDiv.innerHTML = "<h2>検出された P の候補</h2>";

        const selectedCoords = [];
        let detected = false; // P が検出されたか判定

        words.forEach(word => {
            if (word.text.toUpperCase() === "P") { // P または p を認識
                detected = true;
                const { x0, y0, x1, y1 } = word.bbox;
                console.log(`P 検出: X=${x0}, Y=${y0}`);

                // P の周囲 50px を切り取る
                const croppedCanvas = document.createElement("canvas");
                const ctx = croppedCanvas.getContext("2d");

                const cropSize = 50;
                croppedCanvas.width = cropSize;
                croppedCanvas.height = cropSize;
                ctx.drawImage(canvas, x0 - cropSize / 2, y0 - cropSize / 2, cropSize, cropSize, 0, 0, cropSize, cropSize);

                // 画像を表示し、クリックで座標を取得
                const imgElement = document.createElement("img");
                imgElement.src = croppedCanvas.toDataURL();
                imgElement.className = "result-img";
                imgElement.onclick = function() {
                    selectedCoords.push({ x: x0, y: y0 });
                    updateSelectedCoords(selectedCoords);
                };

                outputDiv.appendChild(imgElement);
            }
        });

        if (!detected) {
            outputDiv.innerHTML += "<p style='color: red;'>P が見つかりませんでした。</p>";
        }
    });
}

function updateSelectedCoords(coords) {
    const selectedDiv = document.getElementById("selectedCoords");
    selectedDiv.innerHTML = "<h3>選択した P の座標:</h3>" + coords.map(c => `<p>X: ${c.x}, Y: ${c.y}</p>`).join("");
}
