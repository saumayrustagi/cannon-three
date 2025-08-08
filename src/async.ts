import { type MinificationTextureFilter, Texture, TextureLoader } from "three";

export function asyncTextureLoad(
	textureLoader: TextureLoader,
	url: string,
	minFilter: MinificationTextureFilter,
	colorSpace: string,
	anisotropy: number,
): Promise<Texture> {
	return new Promise((resolve, reject) => {
		textureLoader.load(
			url,
			(texture) => {
				texture.minFilter = minFilter;
				texture.colorSpace = colorSpace;
				texture.anisotropy = anisotropy;
				resolve(texture);
			},
			undefined,
			(err) => reject(err),
		);
	});
}
