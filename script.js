document.getElementById("uploadForm").addEventListener("submit", function(e) {
    e.preventDefault(); // ページリロードを防止

    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) {
        alert("画像を選択してください！");
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
    // OCR で P の座標を取得
    Tesseract.recognize(img.src, "eng", {
        logger: m => console.log(m) // 進行状況をコンソールに出力
    }).then(({ data: { words } }) => {
        const outputDiv = document.getElementById("output");
        outputDiv.innerHTML = "<h2>検出された P の候補</h2>";

        const selectedCoords = [];
        
        words.forEach(word => {
            if (word.text === "P") {
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

        if (words.length === 0) {
            outputDiv.innerHTML += "<p>P が見つかりませんでした。</p>";
        }
    });
}

function updateSelectedCoords(coords) {
    const selectedDiv = document.getElementById("selectedCoords");
    selectedDiv.innerHTML = "<h3>選択した P の座標:</h3>" + coords.map(c => `<p>X: ${c.x}, Y: ${c.y}</p>`).join("");
}
