import { check } from "@tauri-apps/plugin-updater";
import { ask, message } from "@tauri-apps/plugin-dialog";
import { exit, relaunch } from "@tauri-apps/plugin-process";

export const checkForAppUpdates = async () => {
  const update = await check();

  console.log("update");
  console.log(update);
  if (update?.available) {
    const yes = await ask(
      `
Update to ${update.version} is available!
Release notes: ${update.body}
        `,
      {
        title: "Update Now!",
        kind: "info",
        okLabel: "Update",
        cancelLabel: "Cancel",
      },
    );
    //     await message(
    //       `
    // Update to ${update.version} is available!
    // Release notes: ${update.body}
    //         `,
    //       {
    //         title: "Update Now!",
    //         kind: "info",
    //         okLabel: "Update",
    //       },
    //     );

    if (yes) {
      let downloaded = 0;
      let contentLength = 0;
      await update.downloadAndInstall((progress) => {
        switch (progress.event) {
          case "Started":
            contentLength = progress.data.contentLength!;
            break;
          case "Progress":
            downloaded += progress.data.chunkLength;
            console.log(`downloaded ${downloaded} from ${contentLength}`);
            break;
          case "Finished":
            break;
        }
      });
      // await relaunch();
      // TODO: windows exit
    }
  }
};
