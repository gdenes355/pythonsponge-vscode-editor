import * as vscode from "vscode";
import { v4 as uuidv4 } from "uuid";

import { BookEditorProvider } from "./bookeditor";

export async function OpenBookEditorCommand() {
  const folder = vscode.workspace.workspaceFolders?.[0].uri.fsPath;
  if (!folder) {
    vscode.window.showErrorMessage("No workspace folder open");
    return;
  }
  await vscode.window.tabGroups.close(vscode.window.tabGroups.all);

  try {
    await vscode.workspace.fs.stat(vscode.Uri.file(folder + "/book.json"));
  } catch {
    const wsedit = new vscode.WorkspaceEdit();
    const filePath = vscode.Uri.file(folder + "/book.json");
    wsedit.createFile(filePath, { ignoreIfExists: true });
    let text = `{
      "$schema": "https://raw.githubusercontent.com/gdenes355/python-frontend/main/bookSchema.json",
      "id": "${uuidv4()}",
      "name": "New book"
      }`;
    wsedit.insert(filePath, new vscode.Position(0, 0), text);
    await vscode.workspace.applyEdit(wsedit);
  }

  vscode.window.showTextDocument(vscode.Uri.file(folder + "/book.json"), {
    preview: false,
    viewColumn: vscode.ViewColumn.Three,
    preserveFocus: true,
  });

  //
  vscode.commands.executeCommand(
    "vscode.openWith",
    vscode.Uri.file(folder + "/book.json"),
    BookEditorProvider.viewType,
    vscode.ViewColumn.Four
  );
}
