function examplePendulum(visualizer) {
    console.log("nya");
    let a = new PhysicalObject(600, -200, {type: "rectangle", height: 500, width: 4000});
    Matter.Body.setMass(a.getBody(), 1000000000);
    //let b = new PhysicalObject(300, 300, {type: "polygon", sides:3, radius: 20});
    let c = new PhysicalObject(600, 300, {type: "polygon", sides:90, radius: 60});
    Matter.Body.setMass(c.getBody(), 1);
    a.addToEngine(engine);
    //b.addToEngine(engine);
    c.addToEngine(engine);
    let pointA = Matter.Vector.create(600, 50);
    let pointB = Matter.Vector.create(600, 300);
    let spring = new springBond(a, pointA, c, pointB, 1, 200);
    visualizer.addSpringsVisuals(spring);
}

function exampleMathPendulum(visualizer) {
    console.log("nya");
    let a = new PhysicalObject(600, -200, {type: "rectangle", height: 500, width: 4000});
    Matter.Body.setMass(a.getBody(), 1000000000);
    //let b = new PhysicalObject(300, 300, {type: "polygon", sides:3, radius: 20});
    let c = new PhysicalObject(825, 300, {type: "polygon", sides:90, radius: 60});
    Matter.Body.setMass(c.getBody(), 1);
    a.addToEngine(engine);
    //b.addToEngine(engine);
    c.addToEngine(engine);
    let pointA = Matter.Vector.create(600, 50);
    let pointB = Matter.Vector.create(825, 350);
    let spring = new springBond(a, pointA, c, pointB, 100000000, 300);
    visualizer.addSpringsVisuals(spring);
    let force = new ConstantForce(0, -9.8);
    c.attachForce(force);
}

function exampleEllipse(visualizer) {
    let a = new PhysicalObject(1000, 300, {type: "polygon", sides:90, radius: 15});
    Matter.Body.setMass(a.getBody(), 1e7);
    Matter.Body.setVelocity(a.getBody(), Matter.Vector.create(0, 3000));
    let b = new PhysicalObject(500, 300, {type: "polygon", sides:90, radius: 15});
    Matter.Body.setVelocity(b.getBody(), Matter.Vector.create(0, -3000));
    Matter.Body.setMass(b.getBody(), 1e7);
    a.addToEngine(engine);
    b.addToEngine(engine);
    let force = new Gravity();
    a.attachForce(force);
    b.attachForce(force);
}