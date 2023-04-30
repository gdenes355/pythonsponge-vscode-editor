import * as vscode from "vscode";
import { v4 as uuidv4 } from "uuid";

import { BookEditorProvider } from "./bookeditor";

const createNewBook = async (folder: string) => {
  const wsedit = new vscode.WorkspaceEdit();

  // create Python file
  const pyPath = vscode.Uri.file(folder + "/c01.py");
  wsedit.createFile(pyPath, { ignoreIfExists: true });
  wsedit.insert(pyPath, new vscode.Position(0, 0), 'print("Hello world")');

  // create Markdown guide file
  const mdPath = vscode.Uri.file(folder + "/c01.md");
  wsedit.createFile(mdPath, { ignoreIfExists: true });
  wsedit.insert(mdPath, new vscode.Position(0, 0), "# Challenge title");

  // create book.json
  const bookPath = vscode.Uri.file(folder + "/book.json");
  wsedit.createFile(bookPath, { ignoreIfExists: true });
  let data = {
    $schema:
      "https://raw.githubusercontent.com/gdenes355/python-frontend/main/bookSchema.json",
    id: uuidv4(),
    name: "New book",
    children: [
      {
        id: uuidv4(),
        name: "Challenge 1",
        py: "c01.py",
        guide: "c01.md",
      },
    ],
  };

  let text = JSON.stringify(data, null, 2);
  wsedit.insert(bookPath, new vscode.Position(0, 0), text);

  //commit
  await vscode.workspace.applyEdit(wsedit);
  await vscode.workspace.saveAll(false);
};

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
    // no book file found
    let response = await vscode.window.showWarningMessage(
      "No book.json found in this folder. Would you like to create a new one?",
      "Yes",
      "No"
    );

    if (response !== "Yes") {
      return;
    }
    await createNewBook(folder);
  }

  await vscode.window.tabGroups.close(vscode.window.tabGroups.all);

  vscode.window.showTextDocument(vscode.Uri.file(folder + "/c01.py"), {
    preview: false,
    viewColumn: vscode.ViewColumn.One,
    preserveFocus: false,
  });

  vscode.window.showTextDocument(vscode.Uri.file(folder + "/c01.md"), {
    preview: false,
    viewColumn: vscode.ViewColumn.Two,
    preserveFocus: false,
  });

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
