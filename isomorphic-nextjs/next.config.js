const path = require("path");
const nextConfig = {
	env: {
		BACKEND_URL: "https://localhost:8080",
	},
	webpack: (config, options) => {
		config.resolve.alias = {
			...config.resolve.alias,
			"@iso/assets": path.join(__dirname, "assets"),
			"@iso/components": path.join(__dirname, "components"),
			"@iso/config": path.join(__dirname, "config"),
			"@iso/containers": path.join(__dirname, "containers"),
			"@iso/redux": path.join(__dirname, "redux"),
			"@iso/lib": path.join(__dirname, "library"),
			"@iso/ui": path.join(__dirname, "UI"),
		};
		config.module.rules = [
			...config.module.rules,
			{
				test: /\.(js|mjs|jsx|ts|tsx)$/,
				include: [path.resolve(__dirname, 'components')],
				use: [
					{
						loader: 'babel-loader',
						options: {
							presets: ["next/babel"],
							plugins: [
								'@babel/plugin-syntax-jsx',
								'./ApplyDesignSystemPropsPlugin',
							],
						},
					},
				],
			},
		];
		return config;
	},
	webpack5: false,
};

// fix: prevents error when .css files are required by node
// if (typeof require !== 'undefined') {
//   require.extensions['.css'] = file => {};
// }

module.exports = nextConfig;
