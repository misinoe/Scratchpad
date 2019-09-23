import {Application, Container, Graphics, interaction, Point, Text, TextStyle} from 'pixi.js-legacy';
import socketIo from 'socket.io-client';
import Base64 from './Base64';
import querystring from 'querystring';

const view: HTMLCanvasElement = document.getElementById('canvas') as HTMLCanvasElement;
const colorPicker: HTMLInputElement = document.getElementById('color-picker') as HTMLInputElement;
const drawable = {
  x: 0,
  y: 0,
  width: 720,
  height: 547,
  insetPoint(point: {x: number, y: number}) {
    return {
      x: Math.min(this.width, Math.max(this.x, point.x)),
      y: Math.min(this.height, Math.max(this.y, point.y)),
    }
  }
};

const application = new Application({
  view,
  width: 720,
  height: 580,
  autoStart: true,
  resolution: 1,
  antialias: true,
  forceCanvas: true,
  backgroundColor: 0xffffff,
});

const {ticker, stage} = application;
application.ticker.maxFPS = 24;


const queries = querystring.parse(location.search.slice(1));
const roomId = queries.room ? queries.room : '1';
const socket = socketIo(`/${roomId}`);

const background = new Graphics();
background.setParent(stage);

background.beginFill(0xffffff)
  .lineStyle(1, 0xcccccc)
  .drawRect(0, 0, drawable.width, drawable.height);

const cursor = new Graphics();
cursor.setParent(application.stage);
cursor.beginFill(0xff0000)
  .drawCircle(0, 0, 2);

const sharedContainer = new Container().setParent(stage);

const textStyle: TextStyle = new TextStyle({
  fontFamily: 'sans-serif',
  fontSize: 13,
});
const infoLabel = new Text('loading current drawing...', textStyle);
infoLabel.anchor.set(0.5, 0.5);
infoLabel.setParent(stage);
infoLabel.position.set(drawable.width / 2, drawable.height / 2);

const playerCountLabel = new Text('', textStyle);
playerCountLabel.anchor.set(0, 0.5);
playerCountLabel.setParent(stage);
playerCountLabel.position.set(70, 565);

const timerLabel = new Text('', textStyle);
timerLabel.anchor.set(1, 0.5);
timerLabel.setParent(stage);
timerLabel.position.set(710, 565);

const previewContainer = new Container().setParent(stage);

socket.on('disconnect', () => {
  infoLabel.visible = true;
  infoLabel.text = 'disconnected';
});

socket.on('changed', (notify: {name: string, data: any}) => {
  if (infoLabel.visible) infoLabel.visible = false;
  const {name, data} = notify;
  const dataType = name.charAt(0);
  switch (dataType) {
    case 'a':
      const lineData = data as string;
      const color = Base64.decode(lineData.slice(0, 4));
      const pointList = lineData.slice(4).split(',').map(pointString => {
        const rawValue = Base64.decode(pointString);
        const point = {
          x: rawValue & 1023,
          y: (rawValue >> 10) & 1023
        };
        return point;
      });

      const graphics = new Graphics();
      graphics.name = name;
      graphics.setParent(sharedContainer);

      graphics.lineStyle(2, color);
      graphics.moveTo(pointList[0].x, pointList[0].y);
      pointList.slice(1).forEach(point => {
        const {x, y} = point;
        graphics.lineTo(x, y);
      });

      break;
    case 't':
      const time = data as number;
      timerLabel.text = `New round starts in ${time}0 seconds.`;
      break;
    case 'u':
      const userCount = data as number | 0;
      let label = userCount <= 1 ? 'You\'r a only drawing.' : `${userCount} people are drawing.`;
      playerCountLabel.text = label;
      break;
  }
});

socket.on('delete', (deleteNames: string[]) => {
  deleteNames.forEach(name => {
    const child = sharedContainer.getChildByName(name);
    sharedContainer.removeChild(child);
  });
});

let dataBuffer: string;
let previewGraphics: Graphics;
let previousPoint: {x: number, y: number};
background.interactive = true;
background.on('pointerdown', (event: interaction.InteractionPointerEvents) => {
  // @ts-ignore
  const data: interaction.InteractionData = event.data;
  if (!data.isPrimary) return;

  const color = parseInt(colorPicker.value.slice(1), 16);
  previewGraphics = new Graphics();
  previewGraphics.setParent(previewContainer);
  previewGraphics.lineStyle(2, color);
  const {x, y} = drawable.insetPoint(data.global);
  previousPoint = {x, y};

  dataBuffer = Base64.encode(color).padStart(4, '0') + Base64.encode((x & 1023) + (y << 10));

  cursor.visible = true;

  background.on('pointermove', pointerMoveHandler);
  background.once('pointerup', pointerUpHandler);
  background.once('pointerupoutside', pointerUpHandler);
  pointerMoveHandler(event);
});
const pointerMoveHandler = (event: interaction.InteractionPointerEvents) => {
  // @ts-ignore
  const data: interaction.InteractionData = event.data;
  if (!data.isPrimary) return;
  const {x: prevX, y: prevY} = previousPoint;
  const {x, y} = drawable.insetPoint(data.global);

  previewGraphics.moveTo(prevX, prevY);
  previewGraphics.lineTo(x, y);
  previousPoint = {x, y};

  cursor.position.set(x, y);

  dataBuffer += ',' + Base64.encode((x & 1023) + (y << 10));
};
const pointerEnd = () => {

};

const pointerUpHandler = (event?: interaction.InteractionPointerEvents) => {
  // @ts-ignore
  const data: interaction.InteractionData = event.data;
  if (!data.isPrimary) return;
  
  cursor.visible = false;
  
  sharedContainer.removeChild(previewGraphics);

  socket.emit('a', dataBuffer);

  background.off('pointermove', pointerMoveHandler);
  background.off('pointerup', pointerUpHandler);
  background.off('pointerupoutside', pointerUpHandler);
};
