class visualizationBond{
    constructor (visualizer, object, image, outlineObjects, visuals, dcx, dcy){
        this.selected = false;
        this.visualizer = visualizer;
        object.setVisualizationBond(this);
        this.image = image;
        this.outlineObjects = outlineObjects;//SVG collection
        this.object = object;
        this.object.rendererImage = this.image;
        this.visuals = visuals;
        this.object.getImage = function(){
            return this.rendererImage;
        };
        this.dcx = dcx; // centers of image and object are not same because xd
        this.dcy = dcy;
    };

    getVisuals(){
        return this.visuals;
    };

    getObjectImagePair(){
        return {
            object: this.object,
            image: this.image
        }
    };
    getOutlineObjects(){
        return this.outlineObjects;
    };
    select(){
        this.selected = true;
        this.visualizer.addSlected(this);
        this.object.onSelected();//KINDA VERY VERY BAD
    };
    unselect(){
        this.selected = false;
        this.visualizer.removeSlected(this);
    };
    isSelected(){
        return this.selected;
    };
    delete(){
        this.image.remove();
        this.outlineObjects.remove();
    };
    getVisualizer(){
        return this.visualizer;
    };
    recolor(color){
        this.visualizer.recolorBond(this, color);
    };
};

class SVGRender{//ADD CULLING
    static create(obj){
        return new SVGRender(obj);
    }
    constructor(obj){

        this.forceBonds = [];
        this.forceVisualsScale = 2;
        this.springBonds = [];

        this.tools = [];
        this.selected = [];//VisualizationBonds, containing objects that tools act on
        this.selectionColor = "yellow";//Color of outline of any selected object
        this.selectionWidth = 1;
        this.selectionOpacity = 0.9;
        this.infrontElementSelectionOpacity = 0.6;

        this.moveViewCallbacks = [];
        this.scaleViewCallbacks = [];
        this.objectToFollow = undefined;//physical object that viewport follows
        this.objectToFollowDeltas = [0, 0];
        this.pointTopLeft = [0, 0];//coordinates in xy that top left angle of the screen corresponds to
        this.scale = 1//is used to transfer coordinates from simulation to window

        this.visualizationBonds = [];
        this.width = obj.options.width;
        this.height = obj.options.height;
        this.engine = obj.engine;
        this.SVGCanvas = SVG().addTo(obj.element);
        this.SVGCanvas.attr({
            width: this.width,
            height: this.height
        });

        this.contextmenuTag = `<div class = "context_menu" style = "display: none; position: absolute;">
        </div>
        `

        this.JQueryElement = $(this.SVGCanvas.node);
        this.JQueryElement.css({
            "z-index": 1,
        })
        this.contextmenu = $(this.contextmenuTag).appendTo(this.JQueryElement.parent());
        this.contextmenu.css({
            "z-index": 2
        })

        //creating buttons

        let sectionDivision = '<div style = "background-color:#555555;height: 1px; margin-left: -3px; width: "100%";" ></div>';

        let selectAllButton = $('<label class="menu_button context_menu_button">Выделить всё</label>');
        selectAllButton.appendTo(this.contextmenu);
        selectAllButton.on("click", ()=>{
            for (let i in this.visualizationBonds){
                this.visualizationBonds[i].select();
            };
            this.contextmenu.hide();
        });

        let unselectButton = $('<label class="menu_button context_menu_button">Снять выделение</label>');
        unselectButton.appendTo(this.contextmenu);
        unselectButton.on("click", ()=>{
            for (let i in this.visualizationBonds){
                if (this.visualizationBonds[i].isSelected()){
                    this.visualizationBonds[i].unselect();
                };
            };
            this.contextmenu.hide();
        });

        let invertButton = $('<label class="menu_button context_menu_button">Инвертировать выделение</label>');
        invertButton.appendTo(this.contextmenu);
        invertButton.on("click", ()=>{
            for (let i in this.visualizationBonds){
                if (this.visualizationBonds[i].isSelected()){
                    this.visualizationBonds[i].unselect();
                }else{
                    this.visualizationBonds[i].select();
                };
            };
            this.contextmenu.hide();
        });

        $(sectionDivision).appendTo(this.contextmenu);

        let deleteButton = $('<label class="menu_button context_menu_button">Удалить объекты(Delete)</label>');
        deleteButton.appendTo(this.contextmenu);
        deleteButton.on("click", ()=>{
            let selected = this.getSelectedObjects();
            for (let i in selected){
                selected[i].delete();
            };
            this.contextmenu.hide();
        });

        $(document).on("keyup", (e)=>{
            if (e.originalEvent.key === "Delete"){
                let selected = this.getSelectedObjects();
                for (let i in selected){
                    selected[i].delete();
                };
                this.contextmenu.hide();
            };
        });

        $(sectionDivision).appendTo(this.contextmenu);

        let constantForceButton = $('<label class="menu_button context_menu_button">Добавить постоянную силу</label>');
        constantForceButton.appendTo(this.contextmenu);
        constantForceButton.on("click", ()=>{
            let force = new ConstantForce(0, 100);
            let selected = this.getSelectedObjects();
            for (let i in selected){
                selected[i].attachForce(force);
            };
            this.contextmenu.hide();
        });

        let attractionButton = $('<label class="menu_button context_menu_button">Добавить силу тяжести</label>');
        attractionButton.appendTo(this.contextmenu);
        attractionButton.on("click", ()=>{
            let force = new CelestialGravity("one");
            let selected = this.getSelectedObjects();
            for (let i in selected){
                selected[i].attachForce(force);
            };
            this.contextmenu.hide();
        });

        let gravityButton = $('<label class="menu_button context_menu_button">Добавить силу гравитации(без учёта геометрии)</label>');
        gravityButton.appendTo(this.contextmenu);
        gravityButton.on("click", ()=>{
            let force = new Gravity();
            let selected = this.getSelectedObjects();
            for (let i in selected){
                selected[i].attachForce(force);
            };
            this.contextmenu.hide();
        });

        let gravityExactButton = $('<label class="menu_button context_menu_button">Добавить силу гравитации</label>');
        gravityExactButton.appendTo(this.contextmenu);
        gravityExactButton.on("click", ()=>{
            let force = new Gravity();
            let selected = this.getSelectedObjects();
            for (let i in selected){
                selected[i].attachForceDivision(force);
            };
            this.contextmenu.hide();
        });

        //end of creating buttons

        this.JQueryElement.on("mousedown", (e) => {
            if (e.originalEvent.button === 0 || e.originalEvent.button === 1){
                this.contextmenu.css("display", "none");
            };
        });
        this.contextmenu.on("contextmenu", (e)=>{
            e.preventDefault();
        });
        this.JQueryElement.on("contextmenu", (e)=>{
            e.preventDefault();
            this.contextmenu.css("display", "block");
            if (e.offsetY  + this.contextmenu.height() <= this.JQueryElement.height()){
                this.contextmenu.css("top", `${e.pageY}px`);
                this.contextmenu.css("bottom", "unset");
            }else{
                this.contextmenu.css("top", "unset");
                this.contextmenu.css("bottom", `${$("body").height() - (this.JQueryElement.offset().top + this.JQueryElement.height())}px`);//KINDA BUGGY
            }
            if (e.offsetX  + this.contextmenu.width() <= this.JQueryElement.width()){
                this.contextmenu.css("left", `${e.pageX}px`);
                this.contextmenu.css("right", "unset");
            }else{
                this.contextmenu.css("left", "unset");
                this.contextmenu.css("right", `${$("body").width() - (this.JQueryElement.offset().left + this.JQueryElement.width())}px`);//KINDA BUGGY
            }
        });

        //property menu
        let parental = $(obj.element);
        let container = $('<div class="properties"</div>') ;
        container.css({
            position:"absolute",
            display: "flex",
            "flex-direction":"column",
            width:"300px",
            height: parental.height(),
            top: parental.offset().top,
            left: parental.offset().left,
        });
        $("<div></div>").css({
            "flex-basis":0,
            "flex-grow":1,
            opacity: 0,
        }).appendTo(container);
        this.topPart = $("<div></div>").attr({
            class: "property_menu"
        }).css({
            height: "12px",
            display:"flex",
            "flex-direction": "row",
            "z-index": 5
        }).appendTo(container);
        let btn = $("<img>").attr({
            src: "./icons/openproperties.png"
        }).css({
            height: "12px",
            width: "12px",
            draggable: false
        }).appendTo(this.topPart);
        this.title = $("<label>Рандомное название </label>").css({
            "font-size":"10px",
            "align-self": "center",
            "margin-left": "3px"
        }).appendTo(this.topPart);
        this.contents = $("<div></div>").attr({
            class: "property_container"
        }).css({
            height: "auto",
            display: "flex",
            "flex-direction":"column",
            "z-index": 5
        }).appendTo(container);
        //text, min, max, step, _default, callback
        this.contents.hide();
        btn.on("click",()=>{
            if(this.contents.is(":visible")){
                btn.attr({src: "./icons/openproperties.png"})
                this.contents.hide();
            }else{
                btn.attr({src: "./icons/closeproperties.png"});
                this.contents.show();
            };
        });
        container.appendTo(parental);
        //property menu end

        Matter.Events.on(this.engine, "afterUpdate", (event)=>{
            this.update();
        });
        this.engine.SVGvisualizer = this;//KINDA VERY BAD
        //Matter.Events.on(this.engine, "objectAdded", (event)=>{
        //    this.addObject(event.physicalObject, event.overridePolygon);
        //});
        Matter.Events.on(this.engine, "objectDeleted", (event)=>{
            for (let i = 0; i < this.visualizationBonds.length; i++){
                if(this.visualizationBonds[i].getObjectImagePair().object === event.physicalObject){
                    this.visualizationBonds[i].delete();
                    this.visualizationBonds.splice(i, 1);
                    break;
                };
            };
        });
        this.setTitle("");

        //creating a popup
        this.popup = $('<div class = "popupcontainer"></div>').css({
            position: "absolute",
            top: 0,
            left: 0,
            width: $(document).width(),
            height: $(document).height(),
            "z-index": 100,
            "background-color": "transparent",
            "display": "flex",
            "justify-content": "center",
            "align-items": "center",
            color: "white"
        });

        this.popupContents = $('<div class = "popup"></div>').css({
            width: "300px",
            height: "fit-content",
            "background-color": "#333333",
            "overflow-y": "scroll"
        }).appendTo(this.popup);

        parental.append(this.popup);
        this.popup.hide();
    };

    setTitle(text){
        if(text.length === 0){
            this.topPart.hide();
            this.contents.hide();
        }else{
            this.topPart.show();
            this.contents.show();
        }
        this.title.text(text);
    };
    getTitle(){
        return this.title.text();
    }
    addInput(JQuery){
        this.contents.append(JQuery);
    };
    clearInputs(){
        this.contents.children().remove();
    }
    getInputs(){
        return this.contents.children();
    };

    getFloatInput(text, min, max, step, _default, callback){
        let JQwrapper = $("<div></div>").css({
            width: "100%",
            height:" fit-content",
            display:"flex",
            "flex-direction":"column"
        });
        JQwrapper.append($("<p>" + text + "</p>").css({
            "margin-left": "1.125%",
            "margin-right": "1.125%",
            "text-indent": "1.125%",
            "font-size": "10px",
            height: "fit-content",
            "margin-bottom": 0
        }));

        let floatInput = $('<input type="number" class="input-group-text" data-bs-theme="dark"/>').attr({
            min: min,
            max: max,
            step: step,
        }).css({
            "margin-left": "3.375%",
            "margin-right": "1.125%",
            height: "12px",
            "font-size": "10px"
        });
        floatInput.val(_default);

        floatInput.on("change keyup", (e)=>{
            if(e.type === "keyup" && e.originalEvent.key === "Backspace"){
                return;
            };

            if(isNaN(parseFloat(floatInput.val()))){
                floatInput.val(_default);
            };
            if(parseFloat(floatInput.val()) > max){
                floatInput.val(max);
            };
            if(parseFloat(floatInput.val()) < min){
                floatInput.val(min);
            };
            callback(parseFloat(floatInput.val()), e);
        });

        JQwrapper.append(floatInput);
        return JQwrapper;
    };

    getTextInput(text, _default, callback){
        let JQwrapper = $("<div></div>").css({
            width: "100%",
            height:" fit-content",
            display:"flex",
            "flex-direction":"column"
        });
        JQwrapper.append($("<p>" + text + "</p>").css({
            "margin-left": "1.125%",
            "margin-right": "1.125%",
            "text-indent": "1.125%",
            "font-size": "10px",
            height: "fit-content",
            "margin-bottom": 0
        }));

        let textInput = $('<input type="text" class="input-group-text" data-bs-theme="dark"/>').css({
            "margin-left": "3.375%",
            "margin-right": "1.125%",
            height: "12px",
            "font-size": "10px"
        });
        textInput.val(_default);

        textInput.on("change keyup", (e)=>{
            callback(textInput.val(), e);
        });

        JQwrapper.append(textInput);
        return JQwrapper;
    };

    getMultiTextInput(text, _default, callback){
        let JQwrapper = $("<div></div>").css({
            width: "100%",
            height:" fit-content",
            display:"flex",
            "flex-direction":"column"
        });
        JQwrapper.append($("<p>" + text + "</p>").css({
            "margin-left": "1.125%",
            "margin-right": "1.125%",
            "text-indent": "1.125%",
            "font-size": "10px",
            height: "fit-content",
            "margin-bottom": 0
        }));

        let multiTextInput = $('<textarea type="text" class="input-group-text" data-bs-theme="dark"/>').css({
            "margin-left": "3.375%",
            "margin-right": "1.125%",
            height: "48px",
            "font-size": "10px"
        });
        multiTextInput.val(_default);

        multiTextInput.on("change keyup", (e)=>{
            callback(multiTextInput.val(), e);
        });

        JQwrapper.append(multiTextInput);
        return JQwrapper;
    };
    getListInput(text, elements, _default, callback){
        let JQwrapper = $("<div></div>").css({
            width: "100%",
            height:" fit-content",
            display:"flex",
            "flex-direction":"column"
        });
        JQwrapper.append($("<p>" + text + "</p>").css({
            "margin-left": "1.125%",
            "margin-right": "1.125%",
            "text-indent": "1.125%",
            "font-size": "10px",
            height: "fit-content",
            "margin-bottom": 0
        }));

        let listInput = $('<select data-bs-theme="dark"></select>').css({
            "margin-left": "3.375%",
            "margin-right": "1.125%",
            height: "24px",
            "font-size": "10px",
            "line-height": "1.5",
            "color": "var(--bs-body-color)",
            "background-size": "16px 12px",
            "border": "var(--bs-border-width) solid var(--bs-border-color)",
            "border-radius": "var(--bs-border-radius)",
            "transition": "border-color .15s ease-in-out,box-shadow .15s ease-in-out"
        });

        let keys = Object.keys(elements)

        for(let i in keys){
            listInput.append($("<option value = " + keys[i] + ">" + elements[keys[i]] + "</option>"));
        };

        listInput.val(_default);

        listInput.on("change", (e)=>{
            console.log(listInput.val());
            callback(listInput.val(), e);
        });

        JQwrapper.append(listInput);
        return JQwrapper;
    };

    getText(text){
        let JQwrapper = $("<div></div>").css({
            width: "100%",
            height:" fit-content",
            display:"flex",
            "flex-direction":"column"
        });
        JQwrapper.append($("<p>" + text + "</p>").css({
            "margin-left": "1.125%",
            "margin-right": "1.125%",
            "text-indent": "1.125%",
            "font-size": "10px",
            height: "fit-content",
            "margin-bottom": 0
        }));
        return JQwrapper;
    };

    getButton(text, callback){
        let JQwrapper = $("<div></div>").css({
            width: "100%",
            height:" fit-content",
            display:"flex",
            "flex-direction":"column"
        });
        JQwrapper.append($('<button type="button" class="btn btn-dark">' + text + '</button>').css({
            "width": "100%",
            "font-size": "10px",
            height: "fit-content",
            "margin-bottom": 0
        }).on("click", ()=>{callback()}));
        return JQwrapper;
    };

    getSmallButton(text, callback){
        let JQwrapper = $("<div></div>").css({
            width: "100%",
            height:" fit-content",
            display:"flex",
            "flex-direction":"column"
        });
        JQwrapper.append($('<button type="button" class="btn btn-dark">' + text + '</button>').css({
            "width": "100%",
            "height": "12px",
            "font-size": "10px",
            height: "fit-content",
            "margin-bottom": 0
        }).on("click", ()=>{callback()}));
        return JQwrapper;
    };

    getLine(){
        let JQwrapper = $("<div></div>").css({
            width: "100%",
            height:"1px",
            "bakground-color": "#555555",
            "margin-top":"2px",
            "margin-bottom": "1px"
        });
        console.log(JQwrapper);
        return JQwrapper;
    };

    getColorInput(text, _default, callback){
        let JQwrapper = $("<div></div>").css({
            width: "100%",
            height:"fit-content",
            display:"block",
        });

        JQwrapper.append($("<label>" + text + "</label>").css({
            "margin-left": "1.125%",
            "margin-right": "1.125%",
            "text-indent": "1.125%",
            "font-size": "10px",
            height: "fit-content",
            "margin-bottom": 0
        }));

        let colorInput = $('<input type="color" class="input-group-text" data-bs-theme="dark"/></textarea>').css({
            "margin-left": "3.375%",
            "margin-right": "1.125%",
            height: "24px",
            "font-size": "10px"
        });
        colorInput.val(_default);

        colorInput.on("change", (e)=>{
            callback(colorInput.val(), e);
        });

        JQwrapper.append(colorInput);
        return JQwrapper;
    };

    recolorBond(bond, color){
        bond.getVisuals().children().fill(color).stroke(color);
    };

    cx(bond, x) { // if after rotation happening xd, probably problem is here
        bond.image.cx(x + this.scale*(bond.dcx*Math.cos(bond.object.getBody().angle) - bond.dcy*Math.sin(bond.object.getBody().angle)));
    };

    cy(bond, y) {
        bond.image.cy(y + this.scale*(bond.dcx*Math.sin(bond.object.getBody().angle) + bond.dcy*Math.cos(bond.object.getBody().angle)));
    };

    addObject(physicalObject, overridePolygon = undefined) {
        let xPosition = physicalObject.getBody().position.x;
        let yPosition = physicalObject.getBody().position.y;
        let objParts = physicalObject.getBody().parts;
        let SVGObject = this.SVGCanvas.group();
        let color = physicalObject.opt.color;
        if(!overridePolygon){
            for (let i = 0; i < objParts.length; i++) {
                if (i === 0 && objParts.length > 1) {
                    continue;
                };
                let objPartVertices = objParts[i].vertices;
                let vertices = [];
                for (let i = 0; i < objPartVertices.length; i++) {
                    vertices.push(objPartVertices[i].x - xPosition, objPartVertices[i].y - yPosition);

                };
                SVGObject.polygon(vertices).fill(color).stroke(color).opacity(physicalObject.opt.opacity);
            };
        }else{
            SVGObject.polygon(overridePolygon).fill(color).stroke(color).opacity(physicalObject.opt.opacity);
        };
        let outlineObjects = SVGObject.children();
        let SVGObjectFront = SVGObject.clone();
        SVGObject.put(SVGObjectFront);
        outlineObjects.stroke({ color: this.selectionColor, width: this.selectionWidth}).fill(this.selectionColor);
        outlineObjects.opacity(0);
        let bond = new visualizationBond(this, physicalObject, SVGObject, outlineObjects, SVGObjectFront, SVGObject.cx(), SVGObject.cy());
        this.visualizationBonds.push(bond);
        this.cx(bond, this.scale*(xPosition - this.pointTopLeft[0]));
        this.cy(bond, this.scale*(yPosition - this.pointTopLeft[1]));
    };

    openPopup(){
        this.popup.show();
    };
    closePopup(){
        this.popup.hide();
    };
    clearPopupInputs(){
        this.popupContents.children().remove();
    };
    addPopupInput(inp){
        this.popupContents.append(inp);
    };
    addVisualizationBond(bond){
        this.visualizationBonds.push(bond);
    };
    update(){
        if(this.objectToFollow){
            this.pointTopLeft = [
                this.objectToFollowDeltas[0] + this.objectToFollow.getBody().position.x,
                this.objectToFollowDeltas[1] + this.objectToFollow.getBody().position.y
            ];
        };
        this.updateObjectVisuals();
        this.updateForceVisuals();
        this.updateSpringsVisuals();
    }
    scaleView(factor, offsetX, offsetY){
        for(let i = 0; i < this.scaleViewCallbacks.length; i ++){
            this.scaleViewCallbacks[i](factor, offsetX, offsetY);
        };
        this.pointTopLeft[0] += (1 - 1/factor)*offsetX/this.scale;
        this.pointTopLeft[1] += (1 - 1/factor)*offsetY/this.scale;
        for (let i = 0; i < this.visualizationBonds.length; i++){
            let img = this.visualizationBonds[i].getObjectImagePair().image;
            img.size(factor*img.width(), null);
        };
        this.scale *= factor;
        this.update();//I don't want to use another formula
    };
    on(event, callback){
        if (event === "moveview"){
            this.moveViewCallbacks.push(callback);
        }else if (event === "scaleview"){
            this.scaleViewCallbacks.push(callback);
        };
    };
    moveView(doffsetX, doffsetY){
        for(let i = 0; i < this.moveViewCallbacks.length; i ++){
            this.moveViewCallbacks[i](doffsetX, doffsetY);
        };
        this.pointTopLeft[0] += doffsetX/this.scale;
        this.pointTopLeft[1] += doffsetY/this.scale;
        this.update();
    };

    viewPointToWorld(point) {
        return Matter.Vector.create(point[0]/this.scale + this.pointTopLeft[0], point[1]/this.scale + this.pointTopLeft[1]);
    };

    followObject(object){
        if(!object){
            this.objectToFollow = object;
            return;
        };
        this.objectToFollow = object;
        this.objectToFollowDeltas = [
            this.pointTopLeft[0] - this.objectToFollow.getBody().position.x,
            this.pointTopLeft[1] - this.objectToFollow.getBody().position.y
        ];
        this.update();
    };
    resetView(){
        this.objectToFollow = undefined;
        this.pointTopLeft = [0, 0];
        for (let i = 0; i < this.visualizationBonds.length; i++){
            let img = this.visualizationBonds[i].getObjectImagePair().image;
            img.size(img.width()/this.scale, null);
        };
        this.scale = 1;
        this.update();
    };
    toSimulationCoordinates(coords){
        return [coords[0]/this.scale+this.pointTopLeft[0], coords[1]/this.scale+this.pointTopLeft[1]];
    };
    getVisualizationBonds(){
        return this.visualizationBonds;
    };
    getObjects(){
        let obj = [];
        for(let i = 0; i < this.visualizationBonds.length; i++){
            obj.push(this.visualizationBonds[i].getObjectImagePair().object);
        };
        return obj;
    };
    getSelectedObjects(){
        let objects = [];
        for (let i in this.visualizationBonds){
            if (this.visualizationBonds[i].isSelected()){
                objects.push(this.visualizationBonds[i].getObjectImagePair().object);
            };
        };
        return objects;
    };
    getJQuery(){
        return this.JQueryElement;
    };
    getSVGCanvas(){
        return this.SVGCanvas;
    };
    addTool(tool){
        if(tool instanceof Tool){
            this.tools.push(tool);
        };
    };
    deactivateOtherTools(tool){
        for(let i in this.tools){
            if(this.tools[i] != tool){
                this.tools[i].deactivate();
            };
        };
    };
    addSlected(obj){
        if(this.selected.indexOf(obj) === -1){
            obj.getObjectImagePair().image.children().opacity(this.infrontElementSelectionOpacity);
            obj.getOutlineObjects().opacity(this.selectionOpacity);
            this.selected.push(obj);
        };
    };
    removeSlected(obj){
        let index = this.selected.indexOf(obj);
        if (index != -1){
            obj.getObjectImagePair().image.children().opacity(obj   .getObjectImagePair().object.opt.opacity);
            obj.getOutlineObjects().opacity(0);
            this.selected.splice(index, 1);
        };
    };

    addForceVisual(objectForceBond){//Fix arrows
        this.forceBonds.push(objectForceBond);
        let force = objectForceBond.getForceApplied();
        let mod = Matter.Vector.magnitude(force[1]);
        let image = this.SVGCanvas.line(
            (force[0].x - this.pointTopLeft[0])*this.scale,
            (force[0].y - this.pointTopLeft[1])*this.scale,
            (force[0].x + this.forceVisualsScale*Math.log(mod+1)*(force[1].x/mod) - this.pointTopLeft[0])*this.scale,
            (force[0].y + this.forceVisualsScale*Math.log(mod+1)*(force[1].y/mod) - this.pointTopLeft[1])*this.scale
        ).stroke({ width: objectForceBond.getVisuals().strokeWidth, color:  objectForceBond.getVisuals().strokeColor}).marker('end', 10, 10, function(add) {
            add.path('M 0 0 L 10 5 L 0 10 z').fill(objectForceBond.getVisuals().strokeColor).stroke({ width: 1});
        });
        objectForceBond.setSVGImage(image);
    };
    removeForceVisual(objectForceBond){
        let index = this.forceBonds.indexOf(objectForceBond);
        if (index != -1){
            this.forceBonds.splice(index, 1);
            objectForceBond.getSVGImage().remove();
        };
    };//TODO
    updateForceVisuals(){
        for(let i in this.forceBonds){
            let force = this.forceBonds[i].getForceApplied();
            let mod = Matter.Vector.magnitude(force[1]);
            this.forceBonds[i].getSVGImage().attr({
                x1:(force[0].x - this.pointTopLeft[0])*this.scale,
                y1:(force[0].y - this.pointTopLeft[1])*this.scale,
                x2:(force[0].x + this.forceVisualsScale*Math.log(mod+1)*(force[1].x/mod) - this.pointTopLeft[0])*this.scale,
                y2:(force[0].y + this.forceVisualsScale*Math.log(mod+1)*(force[1].y/mod) - this.pointTopLeft[1])*this.scale
            });
        };
    };

    addSpringsVisuals(springBond) {
        this.springBonds.push(springBond);
        let image = this.SVGCanvas.line(
            (springBond.pointA.x - this.pointTopLeft[0])*this.scale,
            (springBond.pointA.y - this.pointTopLeft[1])*this.scale,
            (springBond.pointB.x - this.pointTopLeft[0])*this.scale,
            (springBond.pointB.y - this.pointTopLeft[1])*this.scale
        ).stroke({ width: 2/*springBond.stiffness*/, color:  '#FFFFFF'});
        springBond.setSVGImage(image);
    }
    updateSpringsVisuals() {
        for(let i in this.springBonds){
            this.springBonds[i].getSVGImage().attr({
                x1:(this.springBonds[i].pointA.x - this.pointTopLeft[0])*this.scale,
                y1:(this.springBonds[i].pointA.y - this.pointTopLeft[1])*this.scale,
                x2:(this.springBonds[i].pointB.x - this.pointTopLeft[0])*this.scale,
                y2:(this.springBonds[i].pointB.y - this.pointTopLeft[1])*this.scale
            });
        };
    }

    updateObjectVisuals() {
        for (let i = 0; i < this.visualizationBonds.length; i++){
            let pair = this.visualizationBonds[i].getObjectImagePair();
            let img = pair.image;
            let obj = pair.object;
            this.cx(this.visualizationBonds[i], this.scale*(obj.getBody().position.x - this.pointTopLeft[0]));
            this.cy(this.visualizationBonds[i], this.scale*(obj.getBody().position.y - this.pointTopLeft[1]));
            img.transform({ rotate: obj.getBody().angle/Math.PI*180}); // need radians to degrees - probably not - probably yes
        };
    }

    clear() {
        for (let i in this.forceBonds) {
            this.forceBonds[i].getSVGImage().remove();
        }
        this.forceBonds = [];
        for (let i in this.springBonds) {
            this.springBonds[i].getSVGImage().remove();
        }
        this.springBonds = [];

        this.selected = [];//VisualizationBonds, containing objects that tools act on

        this.moveViewCallbacks = [];
        this.scaleViewCallbacks = [];
        this.objectToFollow = undefined;//physical object that viewport follows
        this.objectToFollowDeltas = [0, 0];
        this.pointTopLeft = [0, 0];
        for (let i = 0; i < this.visualizationBonds.length; i++){
            this.visualizationBonds[i].delete();
        };
        this.scale = 1;
        this.visualizationBonds = [];
        this.update();
    }
}