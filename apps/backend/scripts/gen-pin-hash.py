import sys
import bcrypt

def main():
    if len(sys.argv) < 2:
        print("Usage: python gen_pin_hash.py <pin>")
        sys.exit(1)

    pin = sys.argv[1]

    # bcrypt expects bytes
    pin_bytes = pin.encode("utf-8")

    # cost factor (same as 10 in your TS code)
    salt = bcrypt.gensalt(rounds=10)

    hash_bytes = bcrypt.hashpw(pin_bytes, salt)

    print("PIN:", pin)
    print("Hash:", hash_bytes.decode())

if __name__ == "__main__":
    main()