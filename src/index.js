'use strict';
const React = require('react');
const { clipboard, nativeImage } = require('electron');
const copyIcon = require('./CopyIcon.png');
const noItemsIcon = require('./NoItemsIcon.png');


const clipboardStorage = [];

startWatchingClipboard();

const plugin = ({term, display, actions}) => {
  const match = /clipboard\s(.*)/.exec(term);
  if (match && clipboardStorage.length) {
    const [, filter] = match;
    console.log(clipboardStorage);
    console.log(filter);
    const displayObjs = clipboardStorage.filter(({ type, value }) => {
      if (!filter) return true;
      if (type === 'image') {
        return 'image'.startsWith(filter.toLowerCase());
      }
      return value.toLowerCase().includes(filter.toLowerCase());
    }).map(({ type, value }, i) => {
      const isImage = (type === 'image');
      return isImage ?
        generateImageDisplay({ type, value, i+1 }) :
        generateTextDisplay({ type, value, i+1 })
    });
    display(displayObjs);
  } else if (match) { // length == 0
    display({
      icon: noItemsIcon,
      title: 'Nothing Found in Clipboard.'
    });
  }
};

module.exports = {
  fn: plugin,
  keyword: 'clipboard',
  name: 'View your clipboard history'
}


function generateTextDisplay({ type, value, i }) {
  return {
    icon: copyIcon,
    title: `${i}. ${value}`,
    onSelect: () => {
      actions.copyToClipboard(value);
      new Notification('Text copied to clipboard', {
        body: value
      });
    },
    getPreview: () => (
      <div style={{ whiteSpace: 'pre-wrap' }}>
        <span>{value}</span>
      </div>
    )
  };
}

function generateImageDisplay({ type, value, i }) {
  return {
    icon: copyIcon,
    title: `${i}. Image`,
    onSelect: () => {
      clipboard.writeImage(value);
      new Notification('Image copied to clipboard');
    },
    getPreview: () => (
      <div>
        <img
          src={value.toDataURL()}
          style={{ maxWidth: '100%', maxHeight: '100%' }}
        />
      </div>
    )
  };
}


const imageDataUrlPreambleRegex = /^data:image\/.+;base64,.+/;
function startWatchingClipboard() {
  setInterval(() => {
    let clipboardImageValue = clipboard.readImage();
    const clipboardTextValue = clipboard.readText();

    const textIsImage = imageDataUrlPreambleRegex.test(clipboardTextValue);
    let isImage = textIsImage;
    if (textIsImage) {
      clipboardImageValue = nativeImage.createFromDataURL(clipboardTextValue);
    } else if (imageDataUrlPreambleRegex.test(clipboardImageValue.toDataURL())) {
      isImage = true;
    } else {
      if (!clipboardTextValue || /^\s*$/.test(clipboardTextValue)) {
        return;
      }
    }

    const clipboardValue = {
      type: isImage ? 'image' : 'text',
      value: isImage ? clipboardImageValue : clipboardTextValue
    };

    const lastValue = clipboardStorage[0];
    if (!lastValue || !valuesAreEqual(lastValue, clipboardValue)) {
      clipboardStorage.unshift(clipboardValue);
    }
  }, 1000);
}

function valuesAreEqual(prevValue, newValue) {
  if (prevValue.type !== newValue.type) {
    return false;
  }
  if (prevValue.type === 'image') {
    return prevValue.value.toDataURL() === newValue.value.toDataURL();
  }
  return prevValue.value === newValue.value;
}
