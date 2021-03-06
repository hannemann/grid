export const SELECTORS = {
  slider: ":scope .slides",
  slides: ":scope .slides > *",
};

const CSS_PROPERTY_TRANSITION_TIMING_FUNCTION = "transition-timing-function";

export const DEFAULT_TIMING_FUNCTION = "ease-in-out";

/**
 * possible data attributes:
 * data-current: set index of slide to move to
 * data-duration: set transition duration
 * data-timing-function: set transition timing function
 *
 * Minimal Structure:
 *
 * .carousel>.slides>.slide*n
 */
export class Carousel {
  /**
   * numeric representation of possible directions
   * used to calculate offset of prev and next slides in css
   * @returns {Object.<string, number>}
   */
  static get DIRECTIONS() {
    return {
      back: -1,
      fwd: 1,
    };
  }

  /**
   * utilized classnames
   * @returns {Object.<string, string>}
   */
  static get CLASSNAMES() {
    return {
      prev: "prev",
      cur: "cur",
      next: "next",
      vis: "visible",
      moving: "moving",
    };
  }

  /**
   * events thrown
   * @returns {Object.<string, string>}
   */
  static get EVENTS() {
    return {
      before: "slider-transitionbefore",
      start: "slider-transitionstart",
      end: "slider-transitionend",
      change: "slider-transitionchange",
    };
  }

  /**
   * @param {HTMLElement} el The carousel wrapper element
   */
  constructor(el) {
    this.el = el;
    this.visible = parseInt(this.el.dataset.visible || 1);
    this.initSlides();
    if (this.slides.length > this.visible) {
      this.dir = Carousel.DIRECTIONS.fwd;
      this.initTimingFunction().initDuration().initObserver();
    }
  }

  /**
   * initialize duration
   * @returns {Carousel}
   */
  initDuration() {
    let duration = parseInt(this.el.dataset.duration);
    duration = duration > 0 ? duration : 250;
    this.duration = this.defaultDuration = duration;
    return this;
  }

  /**
   * initialize timing function
   * @returns {Carousel}
   */
  initTimingFunction() {
    const timingFunction = this.el.dataset.timingFunction;
    const old = this.el.style.getPropertyValue(
      CSS_PROPERTY_TRANSITION_TIMING_FUNCTION
    );
    this.el.style.setProperty(
      CSS_PROPERTY_TRANSITION_TIMING_FUNCTION,
      timingFunction
    );
    if (
      timingFunction ===
      this.el.style.getPropertyValue(CSS_PROPERTY_TRANSITION_TIMING_FUNCTION)
    ) {
      this.timingFunction = this.defaultTimingFunction = timingFunction;
    } else {
      this.timingFunction = this.defaultTimingFunction =
        DEFAULT_TIMING_FUNCTION;
    }
    this.el.style.setProperty(CSS_PROPERTY_TRANSITION_TIMING_FUNCTION, old);
    return this;
  }

  /**
   * initialize slides
   * @returns {Carousel}
   * @private
   */
  initSlides() {
    this.slider = this.el.querySelector(SELECTORS.slider);
    /**
     * @type {Array.<HTMLElement>}
     */
    this.slides = Array.from(this.el.querySelectorAll(SELECTORS.slides));
    this.max = this.slides.length - 1;
    this.el.style.setProperty("--item-count", this.slides.length.toString());
    this.prev = this.max;
    this.max > 1 &&
      this.slides[this.prev].classList.add(Carousel.CLASSNAMES.prev);
    this.cur = 0;
    this.slides[this.cur].classList.add(Carousel.CLASSNAMES.cur);
    let i = 1;
    for (i; i < this.visible && i < this.max; i++) {
      this.slides[i]?.classList.add(Carousel.CLASSNAMES.vis);
      this.slides[i]?.style.setProperty("--visible-slide", i.toString());
    }
    this.next = i;
    this.slides[this.next]?.classList.add(Carousel.CLASSNAMES.next);
    return this;
  }

  /**
   * initialize observers
   * @returns {Carousel}
   * @private
   */
  initObserver() {
    this.observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.attributeName === "data-current") {
          this.goto(parseInt(this.el.dataset.current, 10));
        }
        if (m.attributeName === "data-duration") {
          this.initDuration();
        }
        if (m.attributeName === "data-timing-function") {
          this.initTimingFunction();
        }
      });
    });

    this.observer.observe(this.el, { attributes: true });
    return this;
  }

  /**
   * move backward
   * @public
   */
  back() {
    if (this.moving || this.max === 0) return;
    this.dir = Carousel.DIRECTIONS.back;
    this.move();
  }

  /**
   * move forward
   * @public
   */
  fwd() {
    if (this.moving || this.max === 0) return;
    this.dir = Carousel.DIRECTIONS.fwd;
    this.move();
  }

  /**
   * goto slide with index of n
   * @param {Number} n index of slide to go to
   * @public
   */
  goto(n) {
    if (this.moving || this.max === 0) return;
    if (n < 0 || n > this.max) return;
    if (n !== this.cur) {
      this.dir =
        n > this.cur ? Carousel.DIRECTIONS.fwd : Carousel.DIRECTIONS.back;
      this.moveRecursive(n);
    }
  }

  /**
   * recursively move until desired index is reached
   * @param {Number} n goto slide with index of n
   * @private
   */
  moveRecursive(n) {
    const next =
      this.dir === Carousel.DIRECTIONS.fwd ? this.cur + 1 : this.cur - 1;
    this.duration = 60;
    this.timingFunction = "linear";
    if (next !== n) {
      this.slides[this.cur].addEventListener(
        "transitionend",
        () => {
          requestAnimationFrame(() => this.moveRecursive(n));
        },
        { once: true }
      );
    } else {
      this.slides[this.cur].addEventListener(
        "transitionend",
        () => {
          this.timingFunction = this.defaultTimingFunction;
        },
        { once: true }
      );
      // this.step ist the last one so we ease-out the transition and reset the duration
      this.timingFunction = "ease-out";
      this.duration = this.defaultDuration;
    }
    this.move();
  }

  /**
   * move slides
   * @public
   */
  move() {
    this.dispatchTransitionBefore();
    this.moving = true;
    if (this.max === 1) {
      this.transition = false;
      requestAnimationFrame(() => {
        this.slides[this.prev].classList.remove(Carousel.CLASSNAMES.prev);
        requestAnimationFrame(() => {
          this.transition = true;
          this.setCur().setNext().setPrev();
          this.dispatchTransitionStart();
        });
      });
    } else {
      this.setCur().setVis().setNext().setPrev();
      this.dispatchTransitionStart();
    }
  }

  /**
   * determine the cur slide
   * @returns {Carousel}
   * @public
   */
  setCur() {
    this.slides[this.cur].classList.remove(Carousel.CLASSNAMES.cur);
    if (this.dir === Carousel.DIRECTIONS.fwd) {
      this.cur = this.cur + 1 > this.max ? 0 : this.cur + 1;
    } else {
      this.cur = this.cur - 1 < 0 ? this.max : this.cur - 1;
    }
    this.slides[this.cur].classList.add(Carousel.CLASSNAMES.cur);
    return this;
  }

  /**
   * determine the visible slides
   * @returns {Carousel}
   * @public
   */
  setVis() {
    this.slides.forEach((s) => {
      s.classList.remove(Carousel.CLASSNAMES.vis);
      s.style.setProperty("--visible-slide", "");
    });
    let vis = this.cur;
    for (let i = 1; i < this.visible; i++) {
      vis =
        this.cur + i > this.max ? this.cur + i - 1 - this.max : this.cur + i;
      this.slides[vis].classList.add(Carousel.CLASSNAMES.vis);
      this.slides[vis].style.setProperty("--visible-slide", i);
    }
    return this;
  }

  /**
   * determine the next slide
   * @returns {Carousel}
   * @public
   */
  setNext() {
    this.slides[this.next].classList.remove(Carousel.CLASSNAMES.next);
    if (this.dir === Carousel.DIRECTIONS.fwd) {
      this.next =
        this.cur + this.visible > this.max
          ? this.cur + this.visible - 1 - this.max
          : this.cur + this.visible;
    } else {
      this.next = this.cur - 1 < 0 ? this.max : this.cur - 1;
    }
    this.slides[this.next].classList.add(Carousel.CLASSNAMES.next);
    return this;
  }

  /**
   * determine the prev slide
   * @returns {Carousel}
   * @public
   */
  setPrev() {
    this.slides[this.prev].classList.remove(Carousel.CLASSNAMES.prev);
    if (this.dir === Carousel.DIRECTIONS.fwd) {
      this.prev = this.cur - 1 < 0 ? this.max : this.cur - 1;
    } else {
      this.prev =
        this.cur + this.visible > this.max
          ? this.cur + this.visible - 1 - this.max
          : this.cur + this.visible;
    }
    this.slides[this.prev].classList.add(Carousel.CLASSNAMES.prev);
    return this;
  }

  /**
   * dispatch transition change event
   */
  dispatchTransitionChange() {
    this.el.dispatchEvent(
      new CustomEvent(Carousel.EVENTS.change, {
        detail: this.eventData,
      })
    );
  }

  /**
   * dispatch transition start event
   */
  dispatchTransitionBefore() {
    this.el.dispatchEvent(
      new CustomEvent(Carousel.EVENTS.before, {
        detail: this.eventData,
      })
    );
  }

  /**
   * dispatch transition start event
   */
  dispatchTransitionStart() {
    this.el.dispatchEvent(
      new CustomEvent(Carousel.EVENTS.start, {
        detail: this.eventData,
      })
    );
  }

  /**
   * dispatch transition end event
   */
  dispatchTransitionEnd() {
    this.el.dispatchEvent(
      new CustomEvent(Carousel.EVENTS.end, {
        detail: this.eventData,
      })
    );
  }

  /**
   * @typedef {Object} SliderEventData
   * @property {Number} prev
   * @property {Number} cur
   * @property {Number} next
   * @property {Number} dir
   * @property {Number} offset
   * @property {Number} transitionDuration
   * @property {String} transitionTimingFunction
   * @property {String} transitionProperty
   *
   * obtain event details object
   * @returns {SliderEventData}
   * @public
   */
  get eventData() {
    return {
      prev: this.prev,
      cur: this.cur,
      next: this.next,
      dir: this.dir,
      offset: 0,
      transitionDuration: this.duration,
      transitionTimingFunction: this.timingFunction,
      transitionProperty: this.el.style.getPropertyValue(
        "--transition-property"
      ),
    };
  }

  /**
   * obtain index of previous slide
   * @returns {Number}
   */
  get prev() {
    return parseInt(this.el.style.getPropertyValue("--previous"));
  }

  /**
   * set index of previous slide
   * @param {Number} c
   */
  set prev(c) {
    this.el.style.setProperty("--previous", c.toString());
  }

  /**
   * obtain index of current slide
   * @returns {Number}
   */
  get cur() {
    return parseInt(this.el.style.getPropertyValue("--current"));
  }

  /**
   * set index of current slide
   * @param {Number} c
   */
  set cur(c) {
    this.el.style.setProperty("--current", c.toString());
  }

  /**
   * obtain index of next slide
   * @returns {Number}
   */
  get next() {
    return parseInt(this.el.style.getPropertyValue("--next"));
  }

  /**
   * set index of next slide
   * @param {Number} c
   */
  set next(c) {
    this.el.style.setProperty("--next", c.toString());
  }

  /**
   * @param {Number} d 1: fwd, -1: back
   * @private
   */
  set dir(d) {
    this.el.style.setProperty("--move", d.toString());
  }

  /**
   * obtain direction (-1 = back, 1 = fwd)
   * @returns {Number}
   * @private
   */
  get dir() {
    return parseInt(this.el.style.getPropertyValue("--move"));
  }

  /**
   * indicate slider is moving or not
   * @param {Boolean} m
   * @private
   */
  set moving(m) {
    if (m) {
      const reset = () => {
        this.duration = this.defaultDuration;
        this.timingFunction = this.defaultTimingFunction;
        this.moving = false;
        this.dispatchTransitionEnd();
      };
      this.slides[this.cur].addEventListener(
        "transitionend",
        () => {
          if (this.max === 1) {
            this.transition = false;
            requestAnimationFrame(() => {
              this.slides[this.prev].classList.remove(Carousel.CLASSNAMES.prev);
              requestAnimationFrame(() => {
                this.transition = true;
                reset();
              });
            });
          } else {
            reset();
          }
        },
        { once: true }
      );
    }
    this.el.classList.toggle(Carousel.CLASSNAMES.moving, m);
  }

  /**
   * is slider moving?
   * @returns {Boolean}
   * @private
   */
  get moving() {
    return this.el.classList.contains(Carousel.CLASSNAMES.moving);
  }

  /**
   * @param {Number} d transition duration in ms
   * @private
   */
  set duration(d) {
    this.el.style.setProperty("--duration", `${d}ms`);
    this.dispatchTransitionChange();
  }

  /**
   * obtain current duration
   * @returns {Number}
   * @private
   */
  get duration() {
    return parseInt(this.el.style.getPropertyValue("--duration"));
  }

  /**
   * @param {String} fn string representing the timing function
   * @private
   */
  set timingFunction(fn) {
    this.el.style.setProperty("--timing-function", fn);
    this.dispatchTransitionChange();
  }

  /**
   * obtain current timing function
   * @returns {String}
   * @private
   */
  get timingFunction() {
    return this.el.style.getPropertyValue("--timing-function");
  }

  /**
   * en-/disable transition
   * @param {Boolean} t
   * @private
   */
  set transition(t) {
    t = t === true;
    this.el.style.setProperty("--transition-property", t ? "" : "none");
    this.dispatchTransitionChange();
  }

  /**
   * is transition enabled?
   * @returns {Boolean}
   * @private
   */
  get transition() {
    return this.el.style.getPropertyValue("--transition-property") !== "none";
  }

  /**
   * set number of visible slides
   * @params {Number} m
   * @private
   */
  set visible(m) {
    this.el.style.setProperty("--visible", parseInt(m).toString());
  }

  /**
   * obtain number of visible slides
   * @private
   */
  get visible() {
    return parseInt(this.el.style.getPropertyValue("--visible"));
  }
}
