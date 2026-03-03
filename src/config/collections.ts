export const IFRAME_RENDER_WRAPPER_CSS = `
  body {
    overflow: hidden;
  }

  .collection-template-card {
    background: transparent;
    border-radius: 0;
    border: none;
    font-family: Poppins, sans-serif;
    margin: 0 auto;
    box-sizing: border-box;
    display: flex;
    justify-content: center;
    align-items: stretch;
    overflow: hidden;
    position: relative;
  }

  .collection-template-card.css165_250 {
    width: 165px;
    height: 250px;
  }

  .collection-template-card.css160_250 {
    width: 160px;
    height: 250px;
  }

  .collection-template-card.css225_225 {
    width: 225px;
    height: 225px;
  }

  .collection-template-card.css225_300 {
    width: 225px;
    height: 300px;
  }

  .collection-template-card.css340_190 {
    width: 340px;
    height: 190px;
  }

  .collection-template-card.css160_200 {
    width: 160px;
    height: 200px;
  }

  .collection-template-card .collection-template-card-body {
    width: 100%;
    overflow-y: auto;
    overflow-x: hidden;
    background: transparent !important;
  }

  .swiper-slide {
    display: flex;
    justify-content: center;
    box-sizing: border-box;
  }

  .collection-template-card .collection-template-card-body::-webkit-scrollbar {
    width: 4px;
  }

  .collection-template-card .collection-template-card-body::-webkit-scrollbar-thumb {
    background: rgb(93, 95, 239);
    border-radius: 4px;
  }

  .collection-template-card .collection-template-card-body::-webkit-scrollbar-track {
    background: transparent;
  }

  .collection-template-card .collection-template-card-body * {
    word-break: break-word !important;
  }

  .empty-collection {
    display: flex;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    min-height: 180px;
    color: #666;
    background: #fafafa;
    border: 1px dashed #ddd;
    border-radius: 8px;
    text-align: center;
  }

  .empty-collection h4 {
    margin: 8px 0 4px;
    font-size: 16px;
  }

  .empty-collection p {
    font-size: 13px;
  }

  .visit-button {
    position: absolute;
    top: 6px;
    right: 6px;
    z-index: 20;
    font-size: 12px;
    font-weight: 600;
    padding: 4px 8px;
    border-radius: 4px;
    background: #5d5fef;
    color: #ffffff;
    text-decoration: none;
    opacity: 0;
    pointer-events: none;
    transition: opacity 0.2s ease;
  }

  .collection-template-card:hover .visit-button {
    opacity: 1;
    pointer-events: auto;
  }

  .visit-button:hover {
    background: #4a4cd9;
  }
`;

export const COLLECTION_IFRAME_CONFIG = {
  default: {
    cssClass: "css165_250",
    cardFrameWidth: "165px",
    cardFrameHeight: "250px",
    "min-height": "250px",
    cardItem: 4,
  },
  "165x250": {
    cssClass: "css165_250",
    cardFrameWidth: "165px",
    cardFrameHeight: "250px",
    "min-height": "250px",
    cardItem: 4,
  },
  "160x250": {
    cssClass: "css160_250",
    cardFrameWidth: "160px",
    cardFrameHeight: "250px",
    "min-height": "250px",
    cardItem: 4,
  },
  "225x225": {
    cssClass: "css225_225",
    cardFrameWidth: "225px",
    cardFrameHeight: "225px",
    "min-height": "225px",
    cardItem: 3,
  },
  "225x300": {
    cssClass: "css225_300",
    cardFrameWidth: "225px",
    cardFrameHeight: "300px",
    "min-height": "300px",
    cardItem: 3,
  },
  "340x190": {
    cssClass: "css340_190",
    cardFrameWidth: "340px",
    cardFrameHeight: "190px",
    "min-height": "190px",
    cardItem: 2,
  },
  "160x200": {
    cssClass: "css160_200",
    cardFrameWidth: "160px",
    cardFrameHeight: "200px",
    "min-height": "200px",
    cardItem: 4,
  },
} as const;

export type IframeOutputRatio = keyof typeof COLLECTION_IFRAME_CONFIG;
