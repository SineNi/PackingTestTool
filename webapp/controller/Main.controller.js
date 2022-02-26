sap.ui.define([
	"sap/ui/core/mvc/Controller",
	"sap/ui/vk/ContentResource",
	"sap/ui/vk/ContentConnector",
	"sap/ui/vk/thirdparty/three",
	"sap/ui/vk/Camera",
	"EWM/PackingTestTool/utils/Util"
], function (Controller, ContentResource, ContentConnector, threejs, Camera, Util) {
	"use strict";
	return Controller.extend("EWM.PackingTestTool.controller.Main", {
		root: new THREE.Group(),
		font: undefined,
		ratio: 20,
		onInit: function () {
			this.initThreejsModel();
			this.fontLoader();
		},
		fontLoader: function () {
			new THREE.FontLoader().load('./Fonts/helvetiker_bold.typeface.json', function (text) {
				this.font = text;
			}.bind(this));
		},
		initPosition: function (obj, name, posX, posY, posZ, id) {
			obj.name = name;
			obj.position.set(posX, posY, posZ);
			obj.userData.treeNode = {
				sid: id
			};
		},
		initThreejsModel: function () {
			ContentConnector.addContentManagerResolver(this.threejsContentManagerResolver.bind(this));
			this.initPosition(this.root, "Root", 0, 0, 0, "0");

			var camera = new THREE.PerspectiveCamera(45, 604 / 496, 1, 1000);
			// this.initPosition(camera, "camera", 0, 0, 0, "7");
			// this.root.add(camera);

			// this.root.add(new THREE.AmbientLight(0x222222));
			// var light = new THREE.PointLight(0xffffff, 1);
			// camera.add(light);
			this.root.rotateY(-0.2);
			this.root.rotateX(0.1);
			// this.root.rotateZ(-0.2);

			var axes = new THREE.AxesHelper(35);
			this.initPosition(axes, "axe", -15, -12, -12, "1");
			this.root.add(axes);
			this.axes = this.root.children[0];

			this.getView().byId("viewer").addContentResource(
				new ContentResource({
					source: this.root,
					sourceType: "THREE.Object3D",
					name: "Object3D"
				})
			);
		},
		threejsContentManagerResolver: function (contentResource) {
			var that = this;
			if (contentResource.getSource() instanceof THREE.Object3D) {
				return Promise.resolve({
					dimension: 3,
					contentManagerClassName: "sap.ui.vk.threejs.ContentManager",
					settings: {
						loader: that.threejsObjectLoader
					}
				});
			} else {
				return Promise.reject();
			}
		},
		threejsObjectLoader: function (parentNode, contentResource) {
			parentNode.add(contentResource.getSource());
			return Promise.resolve({
				node: parentNode,
				contentResource: contentResource
			});
		},
		onDisplay: function (oEvent) {
			this.axes.children = [];
			var sDimension = this.byId("dimension").getValue();
			var oDimensionModel = Util.isEmpty(sDimension) ? {} : JSON.parse(sDimension);
			var aDimension = Util.isEmpty(oDimensionModel.d) ? oDimensionModel : oDimensionModel.d.results;

			var sPosition = this.byId("position").getValue();
			var oPositionModel = Util.isEmpty(sPosition) ? {} : JSON.parse(sPosition);
			var aPosition = Util.isEmpty(oPositionModel.d) ? [] : oPositionModel.d.results;

			// display HU
			var sInputLength = this.byId("length").getValue();
			var sHULength = Util.isEmpty(sInputLength) ? aDimension[0].laeng_pack : parseFloat(sInputLength);
			var sInputWidth = this.byId("width").getValue();
			var sHUWidth = Util.isEmpty(sInputWidth) ? aDimension[0].breit_pack : parseFloat(sInputWidth);
			var sInputHeight = this.byId("height").getValue();
			var sHUHeight = Util.isEmpty(sInputHeight) ? aDimension[0].hoehe_pack : parseFloat(sInputHeight);
			this.addHU(sHULength, sHUHeight, sHUWidth);

			//display product
			var aProduct = [];
			if (Util.isEmpty(sPosition)) {
				aProduct = aDimension;
			} else {
				for (var i = 0; i < aDimension.length; i++) {
					aProduct.push(Object.assign(aDimension[i], aPosition[i]));
				}
			}
			this.addProducts(aProduct);
		},
		onCalculate: function () {
			var sDimension = this.byId("dimension").getValue();
			var oDimensionModel = Util.isEmpty(sDimension) ? {} : JSON.parse(sDimension);
			$.ajax({
				url: "https://ldai7er9.wdf.sap.corp:44300/z3dpacking?sap-client=003",
				type: "POST",
				data: sDimension,
				contentType: "application/json;charset=utf-8",
				dataType: "json",
				crossDomain: true,
				success: function (data) {
					alert(data); // Object 
				},
				error: function (XMLHttpRequest, textStatus, errorThrown) {
					alert(XMLHttpRequest.status);
					alert(XMLHttpRequest.readyState);
					alert(textStatus);
				},
				complete: function (XMLHttpRequest, textStatus) {}
			});
		},
		findMaxLength: function (iLength, iWidth, iHeight) {
			if (iLength > iWidth) {
				if (iLength > iHeight) {
					return iLength;
				} else {
					return iHeight;
				}
			} else {
				if (iWidth > iHeight) {
					return iWidth;
				} else {
					return iHeight;
				}
			}
		},
		addHU: function (length, width, height) {
			var iLength, iWidth, iHeight;
			if (Util.isEmpty(length) || Util.isEmpty(width) || Util.isEmpty(height)) {
				iLength = 30;
				iWidth = 30;
				iHeight = 30;
				this.ratio = 600 / 30;
			} else {
				iLength = parseFloat(length);
				iWidth = parseFloat(width);
				iHeight = parseFloat(height);
				var iMax = this.findMaxLength(iLength, iWidth, iHeight);
				this.ratio = iMax !== 0 ? iMax / 30 : 600 / 30;
				iLength = iLength / this.ratio;
				iWidth = iWidth / this.ratio;
				iHeight = iHeight / this.ratio;
			}
			//var geometry = new THREE.BoxGeometry(length, width, height);
			var geometry = new THREE.BoxGeometry(iLength, iHeight, iWidth);
			var material = new THREE.MeshBasicMaterial({
				color: 0xFFFFFF,
				opacity: 0.3,
				transparent: true
			});
			var cube = new THREE.Mesh(geometry, material);
			this.initPosition(cube, "hu", iLength / 2, iHeight / 2, iWidth / 2, "2");

			this.axes.add(cube);

			this.getView().byId("viewer").addContentResource(
				new ContentResource({
					source: this.root,
					sourceType: "THREE.Object3D",
					name: "Object3D"
				})
			);
		},
		addProducts: function (aProduct) {
			aProduct.forEach(function (oProduct) {
				this.addProduct(oProduct);
			}.bind(this));

			this.addSequence(aProduct);
		},
		addProduct: function (oProduct) {
			this.adjustOrienation(oProduct);
			var length = oProduct.laeng / this.ratio;
			var width = oProduct.breit / this.ratio;
			var height = oProduct.hoehe / this.ratio;

			//var geometry = new THREE.BoxGeometry(length, width, height);
			var geometry = new THREE.BoxGeometry(length, height, width);
			var material = new THREE.MeshBasicMaterial({
				color: 0x3EABFF,
				opacity: 0.35,
				transparent: true
			});
			var cube = new THREE.Mesh(geometry, material);

			// this.initPosition(cube, "product", oProduct.xpos + length / 2, oProduct.Ypos + width / 2, oProduct.zpos + height / 2, "S" +
			// 	oProduct.PacSequence);
			this.initPosition(cube, "product", oProduct.xpos / this.ratio + length / 2, oProduct.zpos / this.ratio + height / 2, oProduct.ypos /
				this.ratio + width / 2, "S" +
				oProduct.PacSequence);
			this.axes.add(cube);

			this.getView().byId("viewer").addContentResource(
				new ContentResource({
					source: this.root,
					sourceType: "THREE.Object3D",
					name: "Object3D"
				})
			);
		},
		adjustOrienation: function (oProduct) {
			var temp;
			switch (oProduct.orientation) {
			case 2:
				temp = oProduct.laeng;
				oProduct.laeng = oProduct.breit;
				oProduct.breit = temp;
				return oProduct;
			case 3:
				temp = oProduct.breit;
				oProduct.breit = oProduct.hoehe;
				oProduct.hoehe = temp;
				return oProduct;
			case 4:
				temp = oProduct.laeng;
				oProduct.laeng = oProduct.hoehe;
				oProduct.hoehe = oProduct.breit;
				oProduct.breit = temp;
				return oProduct;
			case 5:
				temp = oProduct.laeng;
				oProduct.laeng = oProduct.hoehe;
				oProduct.hoehe = temp;
				return oProduct;
			case 6:
				temp = oProduct.laeng;
				oProduct.laeng = oProduct.breit;
				oProduct.breit = oProduct.hoehe;
				oProduct.hoehe = temp;
				return oProduct;
			default:
				return oProduct;
			}
		},
		addSequence: function (aProduct) {
			var length;
			var width;
			var height;
			var gem;
			var mat;
			var textObj;

			aProduct.forEach(function (oProduct) {
				length = oProduct.laeng / this.ratio;
				width = oProduct.breit / this.ratio;
				height = oProduct.hoehe / this.ratio;
				gem = new THREE.TextGeometry(oProduct.pac_sequence.toString(), {
					size: 2.2,
					height: 0.2, //字的厚度
					weight: 'normal', //or 'bold'
					font: this.font,
					style: 'normal', //or 'italics'，是否斜体
					bevelThickness: 1, //倒角厚度
					bevelSize: 1, //倒角宽度
					curveSegments: 60, //弧线分段数，使得文字的曲线更加光滑
					bevelEnabled: false, //是否使用倒角，意为在边缘处斜切
				});
				//	gem.center();
				mat = new THREE.MeshPhongMaterial({
					color: 0xff0000,
					specular: 0x009900,
					shininess: 30,
					shading: THREE.FlatShading
				});
				textObj = new THREE.Mesh(gem, mat);
				//	textObj.castShadow = true;

				// this.initPosition(textObj, "sequence", oProduct.xpos + length / 2, oProduct.ypos + width / 2, oProduct.zpos + height / 2,
				// 	"Se" +
				// 	oProduct.PacSequence);
				this.initPosition(textObj, "sequence", oProduct.xpos / this.ratio + length / 2, oProduct.zpos / this.ratio + height / 2,
					oProduct.ypos / this.ratio + width / 2, "Se" + oProduct.pac_sequence);
				this.axes.add(textObj);
			}.bind(this));

			this.getView().byId("viewer").addContentResource(
				new ContentResource({
					source: this.root,
					sourceType: "THREE.Object3D",
					name: "Object3D"
				})
			);
		}
	});
});