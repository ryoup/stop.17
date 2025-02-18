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
            processImage(img);
        };
        img.src = reader.result;
    };

    reader.readAsDataURL(file);
});

function processImage(img) {
    const outputDiv = document.getElementById("output");
    outputDiv.innerHTML = `<h2>検出中…</h2>`;  // 検出中の表示

    // OCR で P の座標を取得（精度を甘くする）
    Tesseract.recognize(img.src, "eng", {
        logger: m => console.log(m),  // 進行状況をコンソールに出力
        tessedit_char_whitelist: "Pp" // 小文字 p も許可して誤検出を増やす
    }).then(({ data: { words } }) => {
        outputDiv.innerHTML = "<h2>検出された P の候補</h2>";

        const selectedCoords = [];
        let detected = false; // P が検出されたか判定

        words.forEach(word => {
            if (word.text.toUpperCase() === "P") { // P または p を認識
                detected = true; // P が見つかった
                const { x0, y0, x1, y1 } = word.bbox;
                console.log(`P 検出: X=${x0}, Y=${y0}`);

                // P の周囲 50px を切り取る
                const croppedCanvas = document.createElement("canvas");
                const ctx = croppedCanvas.getContext("2d");

                const cropSize = 50;
                croppedCanvas.width = cropSize;
                croppedCanvas.height = cropSize;
                ctx.drawImage(img, x0 - cropSize / 2, y0 - cropSize / 2, cropSize, cropSize, 0, 0, cropSize, cropSize);

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
