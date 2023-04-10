struct TransformData {
  model: mat4x4<f32>,
  view: mat4x4<f32>,
  projection: mat4x4<f32>,
}

@binding(0) @group(0) var<uniform> transformUBuffer: TransformData;

struct Fragment {
    @builtin(position) Position : vec4<f32>,
    @location(0) UV : vec2<f32>,
    @location(1) FragPosition : vec4<f32>,
};

@vertex
fn main(@location(0) vertexPostion: vec4<f32>, @location(1) vertexColor: vec2<f32>) -> Fragment {
    var output : Fragment;

    output.Position = transformUBuffer.projection * transformUBuffer.view * transformUBuffer.model * vertexPostion;
    output.UV = vertexColor;
    output.FragPosition = vertexPostion;

    return output;
}