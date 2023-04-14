
@binding(1) @group(0) var myTexture: texture_2d<f32>;
@binding(2) @group(0) var mySampler: sampler;

@fragment
fn main(@location(0) UV: vec2<f32>, @location(1) FragPosition: vec4<f32>) -> @location(0) vec4<f32> {
    return textureSample(myTexture, mySampler, UV);
}