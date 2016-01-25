'use strict'

import Morph from './Morph.js';

export default class TabView extends Morph {
  /*
   * HTMLElement callbacks
   */
  attachedCallback() {
    this.tabBar = this.shadowRoot.querySelector('#tab-bar');

    this.tabList = [];
    this.initObserver();

    this.renderTabBar();
    this.hideAllContents();
    this.showDefaultContent();
  }

  detachedCallback() {
    if (this.contentObserver) {
      this.contentObserver.disconnect();
    }
  }

  attributeChangedCallback(attrName, oldValue, newValue) {
    
  }

  initObserver() {
    this.contentObserver = new MutationObserver((record) => this.observerCallback(record));

    //observe for added/removed tab elements
    this.contentObserver.observe(this, {
      childList: true
    });

    //observe each tab element for title changes
    for(let i = 0; i < this.children.length; i++) {
      let child = this.children[i];

      this.contentObserver.observe(child, {
        attributes: true,
        attributeFilter: ['title']
      });
    }
  }

  reInitObserver() {
    this.contentObserver.disconnect();
    this.initObserver();
  }

  observerCallback(mutationRecord) {
    this.renderTabBar();
    this.hideAllContents();
    this.showDefaultContent();

    this.reInitObserver();
  }

  renderTabBar() {
    let contentViews = this.children;
    this.tabList = [];

    if(this.tabBar.hasChildNodes()) {
      let bars = this.tabBar.querySelectorAll('*');

      for(let i = 0; i < bars.length; i++) {
        let bar = bars[i];
        bar.remove();
      }
    }

    for(let i = 0; i < contentViews.length; i++) {
      let view = contentViews[i];
      let title = "";

      if(view.hasAttribute('title')) {
        title = view.getAttribute('title');
      } else {
        title = "TAB[" + i + "]";
      }

      this.tabList[i] = {
        title: title,
        view: view
      };

      let barTitle = document.createElement('span');
      let tab = document.createElement('li');
      barTitle.innerHTML = title;
      barTitle.addEventListener('click', (e) => {
        this.showContent(i);

        let changeEvent = new CustomEvent("tabChange", {
          detail: {
            title: title,
            id: view.id
          }
        });
        this.dispatchEvent(changeEvent);
      });
      tab.appendChild(barTitle);
      this.tabBar.appendChild(tab);
    }
  }

  showContent(i) {
    let tab = this.tabList[i];

    for (let n = 0; n < this.tabBar.children.length; n++) {
      if (n === i) {
        this.tabBar.children[n].classList.add('active');
      } else {
        this.tabBar.children[n].classList.remove('active');
      }
    }
    this.tabBar.querySelector(':nth-child('+i+')')

    this.hideAllContents();
    this.showElement(tab.view);
  }

  hideAllContents() {
    for(let tab of this.tabList) {
      this.hideElement(tab.view);
    }
  }

  showDefaultContent() {
    if(this.tabList.length > 0) {
      this.showContent(0);  
    }
  }

  hideElement(element) {
    element.classList.add("tab-view-inactive");
  }

  showElement(element) {
    element.classList.remove("tab-view-inactive");
  }
}
