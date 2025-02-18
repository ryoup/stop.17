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

        // 画像の読み込み
        const img = new Image();
        img.src = imageDataUrl;
        img.onload = function() {
            processImage(img);
        };
    };

    reader.readAsDataURL(file);
});

function processImage(img) {
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    canvas.width = img.width;
    canvas.height = img.height;
    ctx.drawImage(img, 0, 0, img.width, img.height);

    // OpenCV.js の処理開始
    let src = cv.imread(canvas); // 画像を OpenCV に読み込む
    let gray = new cv.Mat();
    let thresh = new cv.Mat();
    let contours = new cv.MatVector();
    let hierarchy = new cv.Mat();

    cv.cvtColor(src, gray, cv.COLOR_RGBA2GRAY, 0); // グレースケール化
    cv.threshold(gray, thresh, 150, 255, cv.THRESH_BINARY_INV); // しきい値処理（黒背景・白文字）

    cv.findContours(thresh, contours, hierarchy, cv.RETR_EXTERNAL, cv.CHAIN_APPROX_SIMPLE);

    let resultHTML = `<h2>解析結果</h2>`;
    let detectedP = 0;
    const minSize = 30; // 小さすぎるノイズを除外

    for (let i = 0; i < contours.size(); i++) {
        let contour = contours.get(i);
        let rect = cv.boundingRect(contour);

        if (rect.width > minSize && rect.height > minSize) {
            // P らしき形状の切り出し
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
    }

    if (detectedP === 0) {
        resultHTML = `<p style="color:red;">P が検出されませんでした。</p>`;
    }

    document.getElementById("result").innerHTML = resultHTML;

    // メモリを解放
    src.delete();
    gray.delete();
    thresh.delete();
    contours.delete();
    hierarchy.delete();
}
