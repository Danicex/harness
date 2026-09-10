import { renderToStaticMarkup } from "react-dom/server";

export function printReceipt(component, { width = 80, title = "Receipt" } = {}) {
  const html = renderToStaticMarkup(component);

  const iframe = document.createElement("iframe");

  iframe.style.position = "fixed";
  iframe.style.right = "0";
  iframe.style.bottom = "0";
  iframe.style.width = "0";
  iframe.style.height = "0";
  iframe.style.border = "0";

  document.body.appendChild(iframe);

  const doc = iframe.contentWindow.document;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html>
      <head>
        <title>${title}</title>

        <style>
          * {
            box-sizing: border-box;
          }

          html, body {
            width: ${width}mm;
            margin: 0;
            padding: 0;
            font-family: monospace;
            font-size: 12px;
            color: #000;
            background: #fff;
          }

          body {
            padding: 4mm;
          }

          table {
            width: 100%;
            border-collapse: collapse;
          }

          td {
            padding: 2px 0;
          }

          .center { text-align: center; }
          .right { text-align: right; }
          .bold { font-weight: bold; }

          hr {
            border: none;
            border-top: 1px dashed #000;
            margin: 6px 0;
          }

          @page {
            size: ${width}mm auto;
            margin: 0;
          }

          @media print {
            body {
              margin: 0;
              padding: 4mm;
            }
          }
        </style>
      </head>

      <body>
        ${html}
      </body>
    </html>
  `);

  doc.close();

  iframe.contentWindow.focus();

  setTimeout(() => {
    iframe.contentWindow.print();

    setTimeout(() => {
      document.body.removeChild(iframe);
    }, 500);
  }, 100);
}