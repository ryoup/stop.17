let userThreshold = 0.45; // デフォルトのしきい値

// ボタンを押すと閾値を切り替える
function toggleThreshold() {
    const button = document.getElementById("thresholdButton");
    if (userThreshold === 0.45) {
        userThreshold = 0.35;
        button.innerText = "通常に戻す";
        document.getElementById("thresholdDisplay").innerText = "甘め";
    } else {
        userThreshold = 0.45;
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
 * P の候補を表示し、クリックで最小の (x, y) を探す
 */
function extractPRegions(img, points) {
    const outputDiv = document.getElementById("output");
    outputDiv.innerHTML = "<h3>候補</h3>";

    points.forEach(({ x, y }) => {
        const cropWidth = 230;
        const cropHeight = 230;
        const offsetY = 15;

        // **キャンバスにPの位置を描画**
        const croppedCanvas = document.createElement("canvas");
        const ctx = croppedCanvas.getContext("2d");
        croppedCanvas.width = cropWidth;
        croppedCanvas.height = cropHeight;
        ctx.drawImage(img, x - cropWidth / 2, y - offsetY, cropWidth, cropHeight, 0, 0, cropWidth, cropHeight);

        // **Pの正確な座標を切り取った画像内の相対座標に変換**
        const relativeX = x - (x - cropWidth / 2) +22;
        const relativeY = y - (y - offsetY) +32;

        // **Pの位置を○で囲む**
        drawCircle(ctx, relativeX, relativeY);

        const imgElement = document.createElement("img");
        imgElement.src = croppedCanvas.toDataURL();
        imgElement.className = "result-img";
        imgElement.onclick = () => findMinXYInSelection(img, x, y, cropWidth, cropHeight, offsetY);

        outputDiv.appendChild(imgElement);
    });
}

/**
 * 候補画像のPの位置を○で囲む
 */
function drawCircle(ctx, x, y) {
    ctx.strokeStyle = "black"; // 円の色
    ctx.lineWidth = 10; // 線の太さ
    ctx.beginPath();
    ctx.arc(x, y, 32, 0, 2 * Math.PI); // 半径10pxの円
    ctx.stroke();
}

/**
 * 選択した P の元の座標を **originalX + 20, originalY + 30** を基準にして、条件を満たす最小の (X, Y) を取得
 */
function findMinXYInSelection(img, originalX, originalY) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");

    // **元の画像をキャンバスに描画**
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);

    // **基準座標を originalX + 20, originalY + 30 に変更**
    let baseX = originalX + 10;
    let baseY = originalY + 30;

    // **画像の範囲を超えないように調整**
    baseX = Math.min(Math.max(baseX, 0), img.width - 1);
    baseY = Math.min(Math.max(baseY, 0), img.height - 1);

    // **基準のRGB値を取得**
    const basePixelData = ctx.getImageData(baseX, baseY, 1, 1).data;
    const [baseR, baseG, baseB] = basePixelData;

    // **基準RGBのチェック: G > 115 または B > 115 ならエラー**
    if (baseR < 95 || baseG > 115 || baseB > 115) {
        document.getElementById("selectedCoords").innerHTML = `<p style="color: red;">
            エラー ： 条件を満たしていません。
        </p>`;
        return; // **エラー時は処理を中止**
    }

    let bestY = baseY;
    let bestX = baseX;
    let bestRGB = { r: 0, g: 0, b: 0 };

    // **Yの探索: 条件が満たされなくなるまでYを減らす**
    while (bestY > 0) {
        if (bestY >= img.height) break;
        const pixelData = ctx.getImageData(baseX, bestY, 1, 1).data;
        const [r, g, b, a] = pixelData;

        if (a === 0 || g > 115 || b > 115) {
            break;
        }
        bestY--;
        bestRGB = { r, g, b };
    }
    bestY++;

    // **Xの探索: bestY の座標で、条件が満たされなくなるまでXを減らす**
    while (bestX > 0) {
        if (bestX >= img.width) break;
        const pixelData = ctx.getImageData(bestX, bestY, 1, 1).data;
        const [r, g, b, a] = pixelData;

        if (a === 0 || g > 115 || b > 115) {
            break;
        }
        bestX--;
        bestRGB = { r, g, b };
    }
    bestX++;

    // **基準の座標 (baseX, baseY) を画像上にマーク**
    drawCross(ctx, baseX, baseY);

    // **結果を出力**
    updateSelectedCoords(baseX, baseY, { x: bestX, y: bestY }, bestRGB, canvas);
}

/**
 * 画像上に「×」マークを描画（基準のX, Y の位置）
 */
function drawCross(ctx, x, y) {
    ctx.strokeStyle = "red"; // 赤色
    ctx.lineWidth = 3;

    // **「×」マークを描画**
    ctx.beginPath();
    ctx.moveTo(x - 10, y - 10);
    ctx.lineTo(x + 10, y + 10);
    ctx.moveTo(x + 10, y - 10);
    ctx.lineTo(x - 10, y + 10);
    ctx.stroke();
}

/**
 * 選択した P の座標と RGB 値を出力し、基準の座標をマークした画像を表示
 */
function updateSelectedCoords(baseX, baseY, coord, rgb, canvas) {
    document.getElementById("selectedCoords").innerHTML = `<h3>選択キャラの情報</h3>
                                                           <p>X,Y ： ${coord.x}, ${coord.y}</p>
                                                           <p>R,G,B ： ${rgb.r}, ${rgb.g}, ${rgb.b}</p>
                                                           <p>${coord.x.toString(36)}${coord.y.toString(36)}${rgb.r.toString(36)}${rgb.g.toString(36)}${rgb.b.toString(36)}</p>`;
}
