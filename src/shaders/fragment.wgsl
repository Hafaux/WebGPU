@fragment
fn main(@location(0) Color: vec4<f32>, @location(1) FragPosition: vec4<f32>) -> @location(0) vec4<f32> {
    return 0.5 * (FragPosition + vec4(1.0, 1.0, 1.0, 1.0));
}