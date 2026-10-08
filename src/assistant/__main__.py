"""Run the starter assistant:  python -m assistant "where is the training office?" """
import sys

from assistant.rules import reply


def main(argv: list[str] | None = None) -> int:
    argv = sys.argv[1:] if argv is None else argv
    if argv:
        print(reply(" ".join(argv)))
        return 0
    print("Study assistant (starter). Type 'quit' to exit.")
    while True:
        try:
            msg = input("> ")
        except EOFError:
            break
        if msg.strip().lower() in {"quit", "exit"}:
            break
        print(reply(msg))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
