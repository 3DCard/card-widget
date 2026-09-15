"""Injects mesh/node names into a GLB that doesn't have them (e.g. Shapr3D's
GLB export, which doesn't carry the Items-list body names into the file).

Names are assigned in the order the meshes appear in the GLB's JSON, which
matches the order the bodies were exported in. Run once per export:

    python3 scripts/rename_glb_meshes.py <input.glb> <output.glb> "Name 1" "Name 2" ...

Pass the same path for input and output to rename in place. If you're not
sure which body ends up first, run it, then open the widget and check which
swatch controls which part — if they're swapped, just re-run with the names
in the other order.
"""
import json
import struct
import sys


def main():
    if len(sys.argv) < 4:
        print(__doc__)
        sys.exit(1)

    in_path, out_path = sys.argv[1], sys.argv[2]
    names = sys.argv[3:]

    with open(in_path, "rb") as f:
        data = f.read()

    magic, version, total_length = struct.unpack("<III", data[0:12])
    if magic != 0x46546C67:
        raise ValueError("Not a valid GLB file (bad magic number)")

    json_chunk_len, json_chunk_type = struct.unpack("<II", data[12:20])
    json_bytes = data[20 : 20 + json_chunk_len]
    gltf = json.loads(json_bytes)

    rest = data[20 + json_chunk_len :]  # remaining chunk(s), e.g. BIN, untouched

    meshes = gltf.get("meshes", [])
    nodes = gltf.get("nodes", [])
    if len(names) > len(meshes):
        raise ValueError(f"Got {len(names)} names but the GLB only has {len(meshes)} meshes")

    node_by_mesh = {n["mesh"]: n for n in nodes if "mesh" in n}

    for i, name in enumerate(names):
        meshes[i]["name"] = name
        if i in node_by_mesh:
            node_by_mesh[i]["name"] = name
        print(f"mesh {i}: named '{name}'")

    new_json_bytes = bytearray(json.dumps(gltf, separators=(",", ":")).encode("utf-8"))
    while len(new_json_bytes) % 4 != 0:
        new_json_bytes.extend(b" ")

    new_total_length = 12 + 8 + len(new_json_bytes) + len(rest)

    with open(out_path, "wb") as f:
        f.write(b"glTF")
        f.write(struct.pack("<I", version))
        f.write(struct.pack("<I", new_total_length))
        f.write(struct.pack("<I", len(new_json_bytes)))
        f.write(b"JSON")
        f.write(new_json_bytes)
        f.write(rest)

    print(f"Wrote {out_path} ({new_total_length} bytes)")


if __name__ == "__main__":
    main()
