			var canvasWidth = 570,
				canvasHeight = 570,
				previewHeight = 570,
				previewWidth = 570,
				magicNumber = 165,
				pointArray = [],
				previewMesh = null;   

			// Set up drawing window (d'awww)
			var scene = new THREE.Scene();
			var camera = new THREE.PerspectiveCamera( 45, canvasWidth / canvasHeight, 1, 1000 );
			camera.position.z = 400;

			var renderer = new THREE.CanvasRenderer();
			renderer.setSize( canvasWidth, canvasHeight );
			document.getElementById('windows').appendChild( renderer.domElement ).setAttribute( 'id', 'editWindow' );
			
			drawLine( 0, magicNumber, 0, -magicNumber, { color: 0x0000FF, dashed: true, thickness: 2 } );

			renderer.render(scene, camera);

			// Set up preview window
			var previewScene = new THREE.Scene();
			var previewCamera = new THREE.PerspectiveCamera( 45, previewWidth / previewHeight, 1, 1000 );
			previewCamera.position.z = 400;
			var previewWindow = new THREE.WebGLRenderer({ antialias: true });
			previewWindow.setSize( previewWidth, previewHeight );

	        var light = new THREE.PointLight( 0xFFFFFF, 1.5 );
	        light.position.set( 20, 20, 600 );
	        previewScene.add( light );

			document.getElementById('windows').appendChild( previewWindow.domElement ).setAttribute( 'id', 'previewWindow' );
			previewWindow.render( previewScene, previewCamera );

			function drawLine( x1, y1, x2, y2, options ) {
				options = options || {};
				color = options.color || 0x000000;
				thickness = options.thickness || 1;
				dashed = options.dashed || false;

				var path = new THREE.Geometry();

				path.vertices.push(new THREE.Vector3( x1, y1, 0));
				path.vertices.push(new THREE.Vector3( x2, y2, 0));
				path.computeLineDistances();

				var lineMaterial = dashed ? 
					new THREE.LineDashedMaterial({ dashSize: 4, gapSize: 5, opacity: 0.25 }) : 
					new THREE.LineBasicMaterial();
				lineMaterial.color = new THREE.Color( color );
				lineMaterial.linewidth = thickness;
				var line = new THREE.Line( path, lineMaterial );
				scene.add( line );
				renderer.render(scene, camera);
			}


			function addPoint( x, y ) {

				// console.log("addPoint(" + x + ', ' + y + ');');

				var sphere = new THREE.Mesh(
					new THREE.SphereGeometry(2.5), 
					new THREE.MeshBasicMaterial({ color: new THREE.Color(0x5F5F9F) })
				);
				sphere.overdraw = true;
				sphere.position.x = x;
				sphere.position.y = y;
				pointArray.push([ x, y ]);
				scene.add( sphere );

				// Draw a line connecting the dots
				if ( pointArray.length > 1 ) {
					drawLine( 
						pointArray[ pointArray.length - 2 ][0], pointArray[ pointArray.length - 2 ][1], 
						pointArray[ pointArray.length - 1 ][0], pointArray[ pointArray.length - 1 ][1],
						{ thickness: 2 }
					);
				}
				renderer.render(scene, camera);
				updateButtonStates();
			}

			// Enable / disable the Lathe and STL buttons
			function updateButtonStates() {
				// Less than three poitns are not lathe-able
				if (pointArray.length < 3) {
					$('#lathe').prop('disabled', true);
				} else {
					$('#lathe').prop('disabled', false);
				}

				// Preview mesh is required for an export
				if ( previewMesh ) {
					$('#exportstl').prop('disabled', false);
				} else {
					$('#exportstl').prop('disabled', true);
				}

			}

			jQuery(document).ready(function($) {

				// Wine Glass
				addPoint(0, 4.68);
				addPoint(30.16, 9.36);
				addPoint(49.4, 34.32);
				addPoint(40.56, 99.32000000000001);
				addPoint(47.32, 99.84);
				addPoint(57.72, 33.28);
				addPoint(33.28, 1.04);
				addPoint(5.720000000000001, -9.36);
				addPoint(4.16, -73.32000000000001);
				addPoint(43.68, -85.28);
				addPoint(0.52, -85.28);

				// Preload our bump map texture
				var texture = THREE.ImageUtils.loadTexture('images/texture.png', {}, function() {
					previewWindow.render( previewScene, previewCamera );
				});

				$('#lathe').on('click', function(e) {
					e.preventDefault();

					// Remove old mesh
					if ( previewMesh != null ) {
						previewScene.remove( previewMesh );
						previewWindow.render( previewScene, previewCamera);
					}

					// if someone didn't draw a very good shape with enough points
					if (pointArray.length < 3) {
						return;
					}

					var path = new THREE.Geometry();

					$.each( pointArray, function(i,p) {
						path.vertices.push( new THREE.Vector3( 0, p[0], p[1] ) );
					});

					// Snap first point
					if ( path.vertices[0].y < 1.5 )
						path.vertices[0].y = 0.001;

					// Snap last point
					if ( path.vertices[ path.vertices.length - 1 ].y < 1.5 )
						path.vertices[ path.vertices.length - 1 ].y = 0.001;

					// Connect back to the first point and make a loop
					path.vertices.push( path.vertices[0] );

					var material = new THREE.MeshPhongMaterial({ 
						color: new THREE.Color( 0x2020FF ),
						shininess: 200,
						specular: 0x202020,
						bumpMap: texture,
						bumpScale: 3,
						side: THREE.DoubleSide
					});

					previewMesh = new THREE.Mesh( 
						new THREE.LatheGeometry( path.vertices, 32 ), material
					);

					previewScene.add( previewMesh );
					previewMesh.rotation.x = -Math.PI / 2;
					previewWindow.render( previewScene, previewCamera);
					updateButtonStates();
				});

				$('#lathe').click();

				$('#exportstl').on('click', function(e) {
					e.preventDefault();
					if (!previewMesh) {
						return;
					}
					saveSTL( previewMesh.geometry );
				});

				$('#clear').on('click', function(e) {
					e.preventDefault();
					if ( !confirm('Are you sure you want to clear everything?') )
						return;
					// Clone the array
					var children = scene.children.slice(0);
					$.each( children, function( i, child) {
						// Remove everything but the dotted line
						if ( i > 0 )
							scene.remove( child );
					});
					pointArray = [];
					renderer.render( scene, camera );
					updateButtonStates();
				});

				$('#undo').on('click', function(e) {
					e.preventDefault();
					// Clone the array
					var children = scene.children.slice(0);
					if ( children.length == 1 )
						return;
					scene.remove( children[ children.length - 1 ] );
					scene.remove( children[ children.length - 2 ] );
					pointArray.pop();
					renderer.render( scene, camera );
					updateButtonStates();
				});


				$('#editWindow').on('click', function(e) {
					var xPos = ( e.offsetX - ( canvasWidth / 2  ) ) * ( magicNumber * 2 / canvasWidth ),
						yPos = ( ( canvasHeight / 2 ) - e.offsetY ) * ( magicNumber * 2 / canvasWidth );
					console.log( e );
					addPoint( xPos, yPos );
					renderer.render(scene, camera);
				});


			    // Mouse Rotation Stuff

			    var mouseDown = false,
			        mouseDownX = 0,
			        mouseDownY = 0,
	                rotateX = 0,
			        rotateY = 0,
			        rotationXMouseDown = 0,
			        rotationYMouseDown = 0;

			    $('#previewWindow').mousedown(function(e) {
			        if ( e.target.tagName != 'CANVAS' )
			            return;
			        if ( previewMesh == null )
			        	return;
			        mouseDown = true;
			        mouseDownX = e.pageX;
			        mouseDownY = e.pageY;
			        rotationXMouseDown = previewMesh.rotation.x,
			        rotationYMouseDown = previewMesh.rotation.y;
			        rotateY = rotateX = 0;
			    }).mouseup(function(e) {
			        mouseDown = false;
			    }).mousemove(function(e) {
			        if ( mouseDown ) {
			            rotateY = ( e.pageX - mouseDownX ) * 0.02;
			            rotateX = ( e.pageY - mouseDownY ) * 0.02;
			            previewMesh.rotation.x = rotationXMouseDown - rotateX;
			            previewMesh.rotation.y = rotationYMouseDown - rotateY;
			            previewWindow.render( previewScene, previewCamera);
			        }
			    });

			    function stringifyVector(vec){
				  return ""+vec.x+" "+vec.y+" "+vec.z;
				}

				function stringifyVertex(vec){
				  return "vertex "+stringifyVector(vec)+" \n";
				}

				function generateSTL(geometry) {
				  var vertices = geometry.vertices;
				  var tris     = geometry.faces;

				  stl = "solid pixel";
				  for (var i = 0; i < tris.length; i++) {
				    stl += ("facet normal "+stringifyVector( tris[i].normal )+" \n");
				    stl += ("outer loop \n");
				    stl += stringifyVertex( vertices[ tris[i].a ] );
				    stl += stringifyVertex( vertices[ tris[i].b ] );
				    stl += stringifyVertex( vertices[ tris[i].c ] );
				    stl += ("endloop \n");
				    stl += ("endfacet \n");
				  }
				  stl += ("endsolid");
				  return stl;
				}

				function saveSTL( geometry ){
	  				var stlString = generateSTL( geometry );
				 	var blob = new Blob([stlString], {type: 'text/plain'});
					saveAs(blob, 'bplug.stl');
				}

			});

/*
	http://stackoverflow.com/questions/11586527/converting-world-coordinates-to-screen-coordinates-in-three-js-using-projection
	http://mrdoob.github.io/three.js/examples/canvas_interactive_cubes.html
*/