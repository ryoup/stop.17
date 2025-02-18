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
  
      // Tesseract.js で画像内の文字認識を実行
      Tesseract.recognize(imageDataUrl, 'eng', {
        logger: m => {} // ログは不要なら空関数
      }).then(result => {
        // result.data.symbols に認識されたシンボルの配列が入る
        const symbols = result.data.symbols;
        // Pまたはpのみを抽出
        const pSymbols = symbols.filter(sym => sym.text === "P" || sym.text === "p");
  
        if (pSymbols.length === 0) {
          document.getElementById("result").innerHTML = `<p style="color:red;">画像からPが検出されませんでした。</p>`;
          return;
        }
  
        // 結果表示用のHTMLを初期化
        let resultsHTML = `<h2>解析結果</h2>`;
  
        // 画像を表示するための隠しcanvasを作成
        const originalImage = new Image();
        originalImage.src = imageDataUrl;
        originalImage.onload = function() {
          // すべてのPシンボルについて処理
          pSymbols.forEach((sym, idx) => {
            // sym.bbox に { x0, y0, x1, y1 } が入っている
            const bbox = sym.bbox;
            // 必要なら余白を追加（ここでは0）
            const margin = 0;
            const sx = Math.max(bbox.x0 - margin, 0);
            const sy = Math.max(bbox.y0 - margin, 0);
            const sw = Math.min(bbox.x1 - bbox.x0 + margin * 2, originalImage.width - sx);
            const sh = Math.min(bbox.y1 - bbox.y0 + margin * 2, originalImage.height - sy);
  
            // Pの切り出し用canvasを作成
            const canvas = document.createElement("canvas");
            canvas.width = sw;
            canvas.height = sh;
            const ctx = canvas.getContext("2d");
            ctx.drawImage(originalImage, sx, sy, sw, sh, 0, 0, sw, sh);
  
            // バウンディングボックスの左上座標を表示（ここでは sx, sy を表示）
            resultsHTML += `<div style="margin-bottom:20px; border: 1px solid #ccc; padding:10px;">
                              <p>P${idx+1}: 位置 (x: ${sx}, y: ${sy})</p>
                              <img src="${canvas.toDataURL()}" alt="P cutout">
                            </div>`;
          });
          document.getElementById("result").innerHTML = resultsHTML;
        };
      }).catch(error => {
        document.getElementById("result").innerHTML = `<p style="color:red;">エラーが発生しました。</p>`;
        console.error(error);
      });
    };
  
    reader.readAsDataURL(file);
  });
  