type ObjType =
  | "v"
  | "vt"
  | "vn"
  | "f"
  | "o"
  | "g"
  | "s"
  | "mtllib"
  | "usemtl"
  | "#";

interface ObjData {
  v: number[][];
  vn: number[][];
  vt: number[][];
}

export interface ObjModel {
  vertexData: Float32Array;
  vertexCount: number;
}

class ObjLoader {
  private static instance: ObjLoader;

  private constructor() {}

  public static getInstance(): ObjLoader {
    if (!ObjLoader.instance) {
      ObjLoader.instance = new ObjLoader();
    }

    return ObjLoader.instance;
  }

  async load(url: string) {
    const response = await fetch(url);
    const text = await response.text();
    const objData: ObjData = {
      v: [],
      vn: [],
      vt: [],
    };

    const faceData: number[] = [];

    for (const line of text.trim().split(/\r?\n/)) {
      const [type, ...data] = line.split(/\s+/) as [`${ObjType}`, ...string[]];

      switch (type) {
        case "#":
          break;
        case "o":
          console.log("Object", data);
          break;
        case "v":
        case "vt":
        case "vn":
          objData[type].push(data.map((v) => parseFloat(v)));
          break;
        case "f":
          this.readFaces(data, objData, faceData);
          break;
        case "mtllib":
          console.log("Material Library", data);
          break;
        case "usemtl":
          console.log("Use Material", data);
          break;
        case "g":
          console.log("Group", data);
          break;
        case "s":
          console.log("Smoothing group", data);
          break;

        default:
          console.log("Unknown", type, data);
          break;
      }
    }

    return {
      vertexCount: faceData.length / 5,
      vertexData: new Float32Array(faceData),
    };
  }

  private readFaces(faceDataStr: string[], data: ObjData, faceData: number[]) {
    const faceIndices = faceDataStr.map((v) =>
      v.split("/").map((i) => Number(i) - 1)
    );

    // triangle count is face count - 2
    const triangleCount = faceIndices.length - 2;

    for (let i = 0; i < triangleCount; i++) {
      const corners = [faceIndices[0], faceIndices[i + 1], faceIndices[i + 2]];

      for (const corner of corners) {
        const [v, vt, _vn] = this.getCorner(corner, data);

        faceData.push(...v, ...vt);
      }
    }
  }

  private getCorner(cornerIndices: number[], objData: ObjData) {
    const [vIdx, vtIdx, vnIdx] = cornerIndices;

    return [objData.v[vIdx], objData.vt[vtIdx], objData.vn[vnIdx]];
  }
}

export default ObjLoader.getInstance();
