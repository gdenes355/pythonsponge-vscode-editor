import * as vscode from "vscode";

export class BookEditorProvider implements vscode.CustomTextEditorProvider {
  public static register(context: vscode.ExtensionContext) {
    const provider = new BookEditorProvider(context);
    const providerRegistration = vscode.window.registerCustomEditorProvider(
      BookEditorProvider.viewType,
      provider,
      {
        webviewOptions: {
          retainContextWhenHidden: true,
        },
      }
    );
    return providerRegistration;
  }

  public static readonly viewType = "pythonsponge-book-editor.bookeditor";

  constructor(private readonly context: vscode.ExtensionContext) {}

  public async resolveCustomTextEditor(
    document: vscode.TextDocument,
    webviewPanel: vscode.WebviewPanel,
    _token: vscode.CancellationToken
  ): Promise<void> {
    const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
    if (!folder) {
      vscode.window.showErrorMessage("No workspace folder open");
      return;
    }

    webviewPanel.webview.options = {
      enableScripts: true,
    };
    webviewPanel.webview.html = this.getHtmlForWebview(webviewPanel.webview);
    function updateWebview(text?: string) {
      webviewPanel.webview.postMessage({
        type: "update",
        text: text || document.getText(),
      });
    }
    webviewPanel.webview.onDidReceiveMessage(
      (message) => {
        switch (message.type) {
          case "ready":
            updateWebview();
            return;
          case "modified":
            const edit = new vscode.WorkspaceEdit();
            const newText = JSON.stringify(message.data, null, 2);
            edit.replace(
              document.uri,
              new vscode.Range(0, 0, document.lineCount, 0),
              newText
            );
            vscode.workspace.applyEdit(edit);
            updateWebview(newText);
            return;
          case "create-file":
            const wsedit = new vscode.WorkspaceEdit();
            const filePath = vscode.Uri.file(folder + "/" + message.url);
            wsedit.createFile(filePath, { ignoreIfExists: true });
            wsedit.insert(filePath, new vscode.Position(0, 0), message.text);
            vscode.workspace.applyEdit(wsedit);
            updateWebview();
            return;
          case "open":
            const pyUri = vscode.Uri.file(folder + "/" + message.node.py);
            vscode.window.showTextDocument(pyUri, {
              preview: true,
              viewColumn: vscode.ViewColumn.One,
              preserveFocus: true,
            });

            const mdUri = vscode.Uri.file(folder + "/" + message.node.guide);
            vscode.window.showTextDocument(mdUri, {
              preview: true,
              viewColumn: vscode.ViewColumn.Two,
              preserveFocus: true,
            });

            vscode.window
              .showTextDocument(vscode.Uri.file(folder + "/book.json"), {
                preview: false,
                viewColumn: vscode.ViewColumn.Three,
                preserveFocus: false,
              })
              .then((editor) => {
                let nodeLoc = editor.document
                  .getText()
                  .indexOf(message.node.id);
                let target = editor.document.positionAt(nodeLoc);
                target = editor.document.validatePosition(target);
                editor.revealRange(
                  new vscode.Range(target, target),
                  vscode.TextEditorRevealType.AtTop
                );
              });
            return;
        }

        vscode.window.showErrorMessage(message.type);
      },
      undefined,
      this.context.subscriptions
    );

    const changeDocumentSubscription = vscode.workspace.onDidChangeTextDocument(
      (e) => {
        if (e.document.uri.toString() === document.uri.toString()) {
          if (!e.document.isDirty) {
            updateWebview();
          }
        }
      }
    );
    webviewPanel.onDidDispose(() => {
      changeDocumentSubscription.dispose();
    });
  }

  private getHtmlForWebview(webview: vscode.Webview): string {
    const iframeOrigin = "https://perse.pythonsponge.com";
    //const iframeOrigin = "http://localhost:3000";
    return `
    <!doctype html><html lang="en">
    <head>

    </head>
    <body>
      <iframe id="frame" src="${iframeOrigin}/book-editor-frame" style="position:fixed; top:0; left:0; bottom:0; right:0; width:100%; height:100%; border:none; margin:0; padding:0; overflow:hidden; z-index:999999;">
      Loading...
      </iframe>
      <script>
        var frameContentWindow = null;
        const iframeOrigin = "${iframeOrigin}";
        const vscode = acquireVsCodeApi();
        onmessage = (event) => { 
          if (event.origin === iframeOrigin) 
          {
            vscode.postMessage(event.data);
          }
          else
          {
            // VSCode to iFrame. Pass it on
            if (!frameContentWindow) frameContentWindow = document.getElementById("frame").contentWindow;
            frameContentWindow.postMessage({type: event.data.type, text: event.data.text}, "*");
          }
        };
      </script>
    </body>
    `;
  }
}
