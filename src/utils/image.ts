export async function getImageBitmap(url: string) {
  const response = await fetch(url);
  const blob = await response.blob();

  return await createImageBitmap(blob);
}
