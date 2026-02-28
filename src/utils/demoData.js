export function generateRectPoints(centerX, centerY, centerZ, width, height, axis, density, noise = 0.01) {
  const points = [];
  const pointCount = Math.floor(width * height * density);

  for (let i = 0; i < pointCount; i++) {
    const u = (Math.random() - 0.5) * width;
    const v = (Math.random() - 0.5) * height;
    const n = (Math.random() - 0.5) * noise;

    let x, y, z;
    if (axis === 'xy') { // Vertical wall facing Z
      x = centerX + u;
      y = centerY + v;
      z = centerZ + n;
    } else if (axis === 'xz') { // Horizontal surface (floor/ceiling/table top)
      x = centerX + u;
      y = centerY + n;
      z = centerZ + v;
    } else if (axis === 'yz') { // Vertical wall facing X
      x = centerX + n;
      y = centerY + v;
      z = centerZ + u;
    }
    points.push({ x, y, z });
  }
  return points;
}

// Helper: Generate points for a 3D box (all 6 faces)
export function generateBoxPoints(cx, cy, cz, width, height, depth, density, noise = 0.01) {
  const points = [];

  // Top face
  points.push(...generateRectPoints(cx, cy + height/2, cz, width, depth, 'xz', density, noise));
  // Bottom face
  points.push(...generateRectPoints(cx, cy - height/2, cz, width, depth, 'xz', density, noise));
  // Front face
  points.push(...generateRectPoints(cx, cy, cz + depth/2, width, height, 'xy', density, noise));
  // Back face
  points.push(...generateRectPoints(cx, cy, cz - depth/2, width, height, 'xy', density, noise));
  // Left face
  points.push(...generateRectPoints(cx - width/2, cy, cz, depth, height, 'yz', density, noise));
  // Right face
  points.push(...generateRectPoints(cx + width/2, cy, cz, depth, height, 'yz', density, noise));

  return points;
}

// Helper: Generate cylinder points (for table legs, lamp posts, etc.)
export function generateCylinderPoints(cx, cy, cz, radius, height, density, noise = 0.005) {
  const points = [];
  const circumference = 2 * Math.PI * radius;
  const pointCount = Math.floor(circumference * height * density * 0.5);

  for (let i = 0; i < pointCount; i++) {
    const angle = Math.random() * Math.PI * 2;
    const h = (Math.random() - 0.5) * height;
    const r = radius + (Math.random() - 0.5) * noise;

    points.push({
      x: cx + Math.cos(angle) * r,
      y: cy + h,
      z: cz + Math.sin(angle) * r
    });
  }
  return points;
}

export function generateDemoPointCloud(count = 10000) {
  const points = [];
  const roomLength = 6.0;  // X axis
  const roomWidth = 5.0;   // Z axis
  const roomHeight = 2.8;  // Y axis
  const density = 800; // Points per square meter

  // =========================================================================
  // ROOM SHELL - Walls, Floor, Ceiling
  // =========================================================================

  // Floor
  points.push(...generateRectPoints(0, 0, 0, roomLength, roomWidth, 'xz', density));

  // Ceiling
  points.push(...generateRectPoints(0, roomHeight, 0, roomLength, roomWidth, 'xz', density * 0.7));

  // Back wall (with window cutout simulated by less points in center)
  for (let i = 0; i < roomLength * roomHeight * density * 0.8; i++) {
    const x = (Math.random() - 0.5) * roomLength;
    const y = Math.random() * roomHeight;
    // Skip window area (center of wall, 1.5m wide, 1m tall, starting at 1m height)
    if (!(x > -0.75 && x < 0.75 && y > 1.0 && y < 2.0)) {
      points.push({ x, y, z: -roomWidth / 2 + (Math.random() - 0.5) * 0.01 });
    }
  }

  // Front wall (with door opening on right side)
  for (let i = 0; i < roomLength * roomHeight * density * 0.8; i++) {
    const x = (Math.random() - 0.5) * roomLength;
    const y = Math.random() * roomHeight;
    // Skip door area (right side, 0.9m wide, 2.1m tall)
    if (!(x > 1.5 && x < 2.4 && y < 2.1)) {
      points.push({ x, y, z: roomWidth / 2 + (Math.random() - 0.5) * 0.01 });
    }
  }

  // Left wall (where staircase will be)
  points.push(...generateRectPoints(-roomLength / 2, roomHeight / 2, 0, roomWidth, roomHeight, 'yz', density * 0.8));

  // Right wall
  points.push(...generateRectPoints(roomLength / 2, roomHeight / 2, 0, roomWidth, roomHeight, 'yz', density * 0.8));

  // =========================================================================
  // STAIRCASE - Along left wall
  // =========================================================================
  const stairWidth = 1.0;
  const stairDepth = 0.28;
  const stairHeight = 0.18;
  const numStairs = 8;

  for (let i = 0; i < numStairs; i++) {
    const stairX = -roomLength / 2 + stairWidth / 2 + 0.05;
    const stairY = stairHeight * (i + 0.5);
    const stairZ = -roomWidth / 2 + 0.5 + stairDepth * i;

    // Stair tread (top surface)
    points.push(...generateRectPoints(stairX, stairHeight * (i + 1), stairZ, stairWidth, stairDepth, 'xz', density * 1.5));

    // Stair riser (vertical front)
    points.push(...generateRectPoints(stairX, stairY, stairZ + stairDepth / 2, stairWidth, stairHeight, 'xy', density * 1.5));
  }

  // Stair railing (simple vertical posts and handrail)
  for (let i = 0; i <= numStairs; i += 2) {
    const postX = -roomLength / 2 + stairWidth + 0.1;
    const postZ = -roomWidth / 2 + 0.5 + stairDepth * i;
    const postHeight = 0.9;
    const baseY = stairHeight * i;
    points.push(...generateCylinderPoints(postX, baseY + postHeight / 2, postZ, 0.025, postHeight, density * 2));
  }

  // =========================================================================
  // COFFEE TABLE - Center of room
  // =========================================================================
  const tableX = 0.3;
  const tableZ = 0.5;
  const tableTopY = 0.45;
  const tableLength = 1.2;
  const tableWidth = 0.6;
  const tableThickness = 0.05;

  // Table top
  points.push(...generateBoxPoints(tableX, tableTopY, tableZ, tableLength, tableThickness, tableWidth, density * 2));

  // Table legs (4 corners)
  const legRadius = 0.03;
  const legHeight = tableTopY - tableThickness / 2;
  const legInset = 0.08;
  points.push(...generateCylinderPoints(tableX - tableLength/2 + legInset, legHeight/2, tableZ - tableWidth/2 + legInset, legRadius, legHeight, density * 3));
  points.push(...generateCylinderPoints(tableX + tableLength/2 - legInset, legHeight/2, tableZ - tableWidth/2 + legInset, legRadius, legHeight, density * 3));
  points.push(...generateCylinderPoints(tableX - tableLength/2 + legInset, legHeight/2, tableZ + tableWidth/2 - legInset, legRadius, legHeight, density * 3));
  points.push(...generateCylinderPoints(tableX + tableLength/2 - legInset, legHeight/2, tableZ + tableWidth/2 - legInset, legRadius, legHeight, density * 3));

  // =========================================================================
  // SOFA/COUCH - Against back wall
  // =========================================================================
  const sofaX = 0.3;
  const sofaZ = -roomWidth / 2 + 0.6;
  const sofaLength = 2.2;
  const sofaDepth = 0.9;
  const seatHeight = 0.45;
  const backHeight = 0.85;

  // Seat cushion
  points.push(...generateBoxPoints(sofaX, seatHeight / 2, sofaZ, sofaLength, seatHeight, sofaDepth * 0.7, density * 1.5));

  // Back cushion
  points.push(...generateBoxPoints(sofaX, (seatHeight + backHeight) / 2, sofaZ - sofaDepth / 2 + 0.15, sofaLength, backHeight - seatHeight, 0.25, density * 1.5));

  // Armrests
  points.push(...generateBoxPoints(sofaX - sofaLength/2 - 0.1, seatHeight * 0.7, sofaZ, 0.15, seatHeight * 0.8, sofaDepth * 0.7, density * 1.5));
  points.push(...generateBoxPoints(sofaX + sofaLength/2 + 0.1, seatHeight * 0.7, sofaZ, 0.15, seatHeight * 0.8, sofaDepth * 0.7, density * 1.5));

  // =========================================================================
  // TV CABINET / ENTERTAINMENT CENTER - Against front-right area
  // =========================================================================
  const cabinetX = roomLength / 2 - 0.9;
  const cabinetZ = roomWidth / 2 - 0.35;
  const cabinetLength = 1.6;
  const cabinetHeight = 0.5;
  const cabinetDepth = 0.45;

  // Main cabinet body
  points.push(...generateBoxPoints(cabinetX, cabinetHeight / 2, cabinetZ, cabinetLength, cabinetHeight, cabinetDepth, density * 1.5));

  // TV (thin rectangle on top of cabinet)
  const tvWidth = 1.2;
  const tvHeight = 0.7;
  const tvThickness = 0.05;
  points.push(...generateBoxPoints(cabinetX, cabinetHeight + tvHeight / 2 + 0.02, cabinetZ, tvWidth, tvHeight, tvThickness, density * 2));

  // TV stand/base
  points.push(...generateBoxPoints(cabinetX, cabinetHeight + 0.05, cabinetZ, 0.3, 0.08, 0.15, density * 2));

  // =========================================================================
  // BOOKSHELF - Against right wall
  // =========================================================================
  const shelfX = roomLength / 2 - 0.2;
  const shelfZ = -0.8;
  const shelfWidth = 0.35;
  const shelfLength = 1.0;
  const shelfHeight = 1.8;

  // Bookshelf frame (back and sides)
  points.push(...generateRectPoints(shelfX, shelfHeight / 2, shelfZ, shelfLength, shelfHeight, 'yz', density * 1.5)); // Back
  points.push(...generateRectPoints(shelfX - shelfWidth / 2, shelfHeight / 2, shelfZ - shelfLength / 2, shelfWidth, shelfHeight, 'xy', density * 1.2)); // Left side
  points.push(...generateRectPoints(shelfX - shelfWidth / 2, shelfHeight / 2, shelfZ + shelfLength / 2, shelfWidth, shelfHeight, 'xy', density * 1.2)); // Right side

  // Shelf surfaces (5 shelves)
  for (let i = 0; i < 5; i++) {
    const shelfY = 0.1 + i * 0.4;
    points.push(...generateRectPoints(shelfX - shelfWidth / 2, shelfY, shelfZ, shelfWidth, shelfLength, 'xz', density * 1.5));
  }

  // Books on shelves (simplified as box clusters)
  for (let i = 1; i < 4; i++) {
    const bookY = 0.1 + i * 0.4 + 0.12;
    const bookX = shelfX - shelfWidth / 2 + 0.08;
    points.push(...generateBoxPoints(bookX, bookY, shelfZ - 0.2, 0.12, 0.22, 0.5, density * 2));
    points.push(...generateBoxPoints(bookX, bookY, shelfZ + 0.25, 0.12, 0.18, 0.35, density * 2));
  }

  // =========================================================================
  // FLOOR LAMP - Corner
  // =========================================================================
  const lampX = roomLength / 2 - 0.4;
  const lampZ = -roomWidth / 2 + 0.4;

  // Lamp pole
  points.push(...generateCylinderPoints(lampX, 0.8, lampZ, 0.02, 1.6, density * 3));

  // Lamp shade (simplified cone as stacked circles)
  for (let i = 0; i < 5; i++) {
    const shadeY = 1.5 + i * 0.05;
    const shadeR = 0.08 + i * 0.03;
    points.push(...generateCylinderPoints(lampX, shadeY, lampZ, shadeR, 0.04, density * 2));
  }

  // Lamp base
  points.push(...generateCylinderPoints(lampX, 0.02, lampZ, 0.12, 0.04, density * 3));

  // =========================================================================
  // AREA RUG - Under coffee table
  // =========================================================================
  const rugX = 0.3;
  const rugZ = 0.2;
  const rugLength = 2.5;
  const rugWidth = 1.8;

  // Rug (slightly above floor to be visible)
  points.push(...generateRectPoints(rugX, 0.005, rugZ, rugLength, rugWidth, 'xz', density * 0.5, 0.003));

  // =========================================================================
  // WINDOW FRAME - On back wall
  // =========================================================================
  const windowX = 0;
  const windowZ = -roomWidth / 2 + 0.02;
  const windowWidth = 1.5;
  const windowHeight = 1.0;
  const windowBottom = 1.0;
  const frameThickness = 0.08;

  // Window frame (4 sides)
  points.push(...generateRectPoints(windowX, windowBottom + frameThickness/2, windowZ, windowWidth, frameThickness, 'xy', density * 2)); // Bottom
  points.push(...generateRectPoints(windowX, windowBottom + windowHeight - frameThickness/2, windowZ, windowWidth, frameThickness, 'xy', density * 2)); // Top
  points.push(...generateRectPoints(windowX - windowWidth/2 + frameThickness/2, windowBottom + windowHeight/2, windowZ, frameThickness, windowHeight, 'xy', density * 2)); // Left
  points.push(...generateRectPoints(windowX + windowWidth/2 - frameThickness/2, windowBottom + windowHeight/2, windowZ, frameThickness, windowHeight, 'xy', density * 2)); // Right

  // Window sill
  points.push(...generateBoxPoints(windowX, windowBottom - 0.03, windowZ + 0.08, windowWidth + 0.1, 0.04, 0.15, density * 2));

  // =========================================================================
  // POTTED PLANT - On window sill
  // =========================================================================
  const plantX = windowX + 0.4;
  const plantZ = windowZ + 0.08;
  const potY = windowBottom + 0.1;

  // Pot
  points.push(...generateCylinderPoints(plantX, potY, plantZ, 0.08, 0.15, density * 3));

  // Plant foliage (cluster of points)
  for (let i = 0; i < 200; i++) {
    const angle = Math.random() * Math.PI * 2;
    const r = Math.random() * 0.15;
    const h = 0.1 + Math.random() * 0.25;
    points.push({
      x: plantX + Math.cos(angle) * r,
      y: potY + 0.1 + h,
      z: plantZ + Math.sin(angle) * r
    });
  }

  return points;
}
