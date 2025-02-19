let userThreshold = 0.5; // デフォルトのしきい値

// ボタンを押すと閾値を切り替える
function toggleThreshold() {
    const button = document.getElementById("thresholdButton");
    if (userThreshold === 0.5) {
        userThreshold = 0.35;
        button.innerText = "元に戻す";
        document.getElementById("thresholdDisplay").innerText = "甘め";
    } else {
        userThreshold = 0.5;
        button.innerText = "甘めにする";
        document.getElementById("thresholdDisplay").innerText = "通常";
    }
}


document.getElementById("uploadForm").addEventListener("submit", async function (e) { 
    e.preventDefault();

    const fileInput = document.getElementById("fileInput");
    if (fileInput.files.length === 0) {
        document.getElementById("output").innerHTML = `<p style="color: red;">画像を選択してください。</p>`;
        return;
    }

    const file = fileInput.files[0];
    const reader = new FileReader();

    reader.onload = async function () {
        const img = new Image();
        img.src = reader.result;
        img.onload = async function () {
            const templateImg = await loadTemplateImage("https://ryoup.github.io/3bMRQu247Wtr8pMABzdUVweAFXmnCYHYKuX5ZYX7BhaRMUSHSf7c7scUABxaFfRRRuZ3j85WH4bN4CVMQ2aMQ7sWigCRhEgSg7dw/template.png");
            if (!templateImg) {
                document.getElementById("output").innerHTML = `<p style="color: red;">テンプレート画像の取得に失敗しました。</p>`;
                return;
            }
            processImage(img, templateImg);
        };
    };
    reader.readAsDataURL(file);
});

/**
 * `fetch()` を使ってテンプレート画像を取得
 */
async function loadTemplateImage(url) {
    try {
        const response = await fetch(url);
        if (!response.ok) throw new Error("テンプレート画像の取得に失敗しました");

        const blob = await response.blob();
        const img = new Image();
        img.src = URL.createObjectURL(blob);

        return new Promise(resolve => img.onload = () => resolve(img));
    } catch (error) {
        return null; // エラー時は null を返す
    }
}

/**
 * OpenCV.js で画像処理を実行
 */
function processImage(img, templateImg) {
    document.getElementById("output").innerHTML = "<h2>検出中…</h2>";

    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);

    const src = cv.imread(canvas);
    const templateCanvas = document.createElement("canvas");
    const templateCtx = templateCanvas.getContext("2d");
    templateCanvas.width = templateImg.width;
    templateCanvas.height = templateImg.height;
    templateCtx.drawImage(templateImg, 0, 0, templateImg.width, templateImg.height);
    const template = cv.imread(templateCanvas);

    const dst = new cv.Mat();
    cv.matchTemplate(src, template, dst, cv.TM_CCOEFF_NORMED);

    const threshold = userThreshold; // ユーザーが選択した閾値
    const points = [];
    const minDistance = 20;

    for (let y = 0; y < dst.rows; y++) {
        for (let x = 0; x < dst.cols; x++) {
            const similarity = dst.floatAt(y, x);
            if (similarity >= threshold) {
                if (!points.some(p => Math.hypot(p.x - x, p.y - y) < minDistance)) {
                    points.push({ x, y, similarity });
                }
            }
        }
    }

    if (points.length > 0) {
        extractPRegions(img, points);
    } else {
        document.getElementById("output").innerHTML = "<p style='color: red;'>P が見つかりませんでした。</p>";
    }

    src.delete();
    template.delete();
    dst.delete();
}

/**
 * 複数の P の候補を切り取って表示
 */
function extractPRegions(img, points) {
    const outputDiv = document.getElementById("output");
    outputDiv.innerHTML = "<h3>候補</h3>";

    points.forEach(({ x, y }) => {
        const cropWidth = 200;
        const cropHeight = 200;
        const offsetY = 15;

        const croppedCanvas = document.createElement("canvas");
        const ctx = croppedCanvas.getContext("2d");
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        ctx.drawImage(img, x - cropWidth / 2, y - offsetY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        const imgElement = document.createElement("img");
        imgElement.src = croppedCanvas.toDataURL();
        imgElement.className = "result-img";
        imgElement.onclick = () => findMinXYInSelection(img, x, y, cropWidth, cropHeight, offsetY);

        outputDiv.appendChild(imgElement);
    });
}

/**
 * 選択した P の画像の中から、X と Y が最小で R>=220, G<=115, B<=115 を満たす座標を取得
 */
function findMinXYInSelection(img, x, y, cropWidth, cropHeight, offsetY) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);

    let bestX, bestY, bestRGB = { r: 0, g: 0, b: 0 };

    for (let j = y - offsetY; j < y - offsetY + cropHeight; j++) {
        for (let i = x - cropWidth / 2; i < x + cropWidth / 2; i++) {
            const [r, g, b] = ctx.getImageData(i, j, 1, 1).data;
            if (r >= 220 && g <= 115 && b <= 115) {
                if (bestY === undefined || j < bestY || (j === bestY && i < bestX)) {
                    bestY = j;
                    bestX = i;
                    bestRGB = { r, g, b };
                }
            }
        }
    }

    if (bestY !== undefined && bestX !== undefined) {
        updateSelectedCoords({ x: bestX, y: bestY }, bestRGB);
    } else {
        document.getElementById("selectedCoords").innerHTML = `<p style="color: red;">条件を満たすピクセルが見つかりませんでした。</p>`;
    }
}

/**
 * 条件を満たす P の座標と RGB 値を出力
 */
function updateSelectedCoords(coord, rgb) {
    document.getElementById("selectedCoords").innerHTML = `<h3>選択キャラの情報:</h3>
                                                           <p>X,Y ： ${coord.x}, ${coord.y}</p>
                                                           <p>R,G,B ： ${rgb.r}, ${rgb.g}, ${rgb.b}</p>`;
}
