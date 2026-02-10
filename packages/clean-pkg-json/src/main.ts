import { clean } from "./clean";
import { restore } from "./restore";

const command = process.argv[2];

switch (command) {
  case "clean": {
    clean();
    break;
  }
  case "restore": {
    restore();
    break;
  }
  default: {
    console.error("Usage: clean-pkg-json <clean|restore>");
    process.exit(1);
  }
}
