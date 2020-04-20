import {
  AfterContentChecked,
  AfterContentInit,
  Attribute,
  ChangeDetectorRef,
  ContentChildren,
  Directive,
  ElementRef,
  EventEmitter,
  forwardRef,
  Inject,
  Input,
  OnInit,
  Output,
  QueryList,
  TemplateRef
} from '@angular/core';
import {DOCUMENT} from '@angular/common';
import {isDefined} from '../util/util';
import {NgbNavConfig} from './nav-config';
import {Key} from '../util/key';

const isValidNavId = (id: any) => isDefined(id) && id !== '';

let navCounter = 0;

/**
 * Context passed to the nav content template.
 *
 * See [this demo](#/components/nav/examples#keep-content) as the example.
 *
 * @since 5.2.0
 */
export interface NgbNavContentContext {
  /**
   * If `true`, current nav content is visible and active
   */
  $implicit: boolean;
}


/**
 * This directive must be used to wrap content to be displayed in the nav.
 *
 * @since 5.2.0
 */
@Directive({selector: 'ng-template[ngbNavContent]'})
export class NgbNavContent {
  constructor(public templateRef: TemplateRef<any>) {}
}


/**
 * The directive used to group nav link and related nav content. As well as set nav identifier and some options.
 *
 * @since 5.2.0
 */
@Directive({selector: '[ngbNavItem]', exportAs: 'ngbNavItem', host: {'[class.nav-item]': 'true'}})
export class NgbNavItem implements AfterContentChecked, OnInit {
  private _nav: NgbNav;

  /**
   * If `true`, non-active current nav item content will be removed from DOM
   * Otherwise it will just be hidden
   */
  @Input() destroyOnHide;

  /**
   * If `true`, the current nav item is disabled and can't be toggled by user.
   *
   * Nevertheless disabled nav can be selected programmatically via the `.select()` method and the `[activeId]` binding.
   */
  @Input() disabled = false;

  /**
   * The id used for the DOM elements.
   * Must be unique inside the document in case you have multiple `ngbNav`s on the page.
   *
   * Autogenerated as `ngb-nav-XXX` if not provided.
   */
  @Input() domId: string;

  /**
   * The id used as a model for active nav.
   * It can be anything, but must be unique inside one `ngbNav`.
   *
   * The only limitation is that it is not possible to have the `''` (empty string) as id,
   * because ` ngbNavItem `, `ngbNavItem=''` and `[ngbNavItem]="''"` are indistinguishable
   */
  @Input('ngbNavItem') _id: any;

  contentTpl: NgbNavContent | null;

  @ContentChildren(NgbNavContent, {descendants: false}) contentTpls: QueryList<NgbNavContent>;

  constructor(@Inject(forwardRef(() => NgbNav)) nav, public elementRef: ElementRef<any>) {
    // TODO: cf https://github.com/angular/angular/issues/30106
    this._nav = nav;
  }

  ngAfterContentChecked() {
    // We are using @ContentChildren instead of @ContentChild as in the Angular version being used
    // only @ContentChildren allows us to specify the {descendants: false} option.
    // Without {descendants: false} we are hitting bugs described in:
    // https://github.com/ng-bootstrap/ng-bootstrap/issues/2240
    this.contentTpl = this.contentTpls.first;
  }

  ngOnInit() {
    if (!isDefined(this.domId)) {
      this.domId = `ngb-nav-${navCounter++}`;
    }
  }

  get active() { return this._nav.activeId === this.id; }

  get id() { return isValidNavId(this._id) ? this._id : this.domId; }

  get panelDomId() { return `${this.domId}-panel`; }

  isPanelInDom() {
    return (isDefined(this.destroyOnHide) ? !this.destroyOnHide : !this._nav.destroyOnHide) || this.active;
  }
}


/**
 * A nav directive that helps with implementing tabbed navigation components.
 *
 * @since 5.2.0
 */
@Directive({
  selector: '[ngbNav]',
  exportAs: 'ngbNav',
  host: {
    '[class.nav]': 'true',
    '[class.flex-column]': `orientation === 'vertical'`,
    '[attr.aria-orientation]': `orientation === 'vertical' && roles === 'tablist' ? 'vertical' : undefined`,
    '[attr.role]': `role ? role : roles ? 'tablist' : undefined`,
    '(keydown.arrowLeft)': 'onKeyDown($event)',
    '(keydown.arrowRight)': 'onKeyDown($event)',
    '(keydown.arrowDown)': 'onKeyDown($event)',
    '(keydown.arrowUp)': 'onKeyDown($event)',
    '(keydown.Home)': 'onKeyDown($event)',
    '(keydown.End)': 'onKeyDown($event)'
  }
})
export class NgbNav implements AfterContentInit {
  static ngAcceptInputType_orientation: string;
  static ngAcceptInputType_roles: boolean | string;

  /**
   * The id of the nav that should be active
   *
   * You could also use the `.select()` method and the `(navChange)` event
   */
  @Input() activeId: any;

  /**
   * The event emitted after the active nav changes
   * The payload of the event is the newly active nav id
   *
   * If you want to prevent nav change, you should use `(navChange)` event
   */
  @Output() activeIdChange = new EventEmitter<any>();

  /**
   * If `true`, non-active nav content will be removed from DOM
   * Otherwise it will just be hidden
   */
  @Input() destroyOnHide;

  /**
   * The orientation of navs.
   *
   * Using `vertical` will also add the `aria-orientation` attribute
   */
  @Input() orientation: 'horizontal' | 'vertical';

  /**
   * Role attribute generating strategy:
   * - `false` - no role attributes will be generated
   * - `'tablist'` - 'tablist', 'tab' and 'tabpanel' will be generated (default)
   */
  @Input() roles: 'tablist' | false;

  /**
   * Determine if the tabs can be selected or changed by arrow left, arrow right, home, end
   *
   * * `false` - no keyboard support.
   * * `true` - the tabs will focused using keyboard
   * * `'changeWithArrows'` -  the tabs will be selected using keyboard
 */
  @Input() keyboard: boolean | 'changeWithArrows';

  @ContentChildren(NgbNavItem) items: QueryList<NgbNavItem>;
  @ContentChildren(forwardRef(() => NgbNavLink), {descendants: true}) links: QueryList<NgbNavLink>;

  constructor(
      @Attribute('role') public role: string, config: NgbNavConfig, private _cd: ChangeDetectorRef,
      @Inject(DOCUMENT) private _document: any) {
    this.destroyOnHide = config.destroyOnHide;
    this.orientation = config.orientation;
    this.roles = config.roles;
    this.keyboard = config.keyboard;
  }

  /**
   * The nav change event emitted right before the nav change happens on user click.
   *
   * This event won't be emitted if nav is changed programmatically via `[activeId]` or `.select()`.
   *
   * See [`NgbNavChangeEvent`](#/components/nav/api#NgbNavChangeEvent) for payload details.
   */
  @Output() navChange = new EventEmitter<NgbNavChangeEvent>();

  click(item: NgbNavItem) {
    if (!item.disabled) {
      this._updateActiveId(item.id);
    }
  }

  onKeyDown(event: KeyboardEvent) {
    if (this.roles !== 'tablist' || !this.keyboard) {
      return;
    }
    // tslint:disable-next-line: deprecation
    const key = event.which;
    const enabledLinks = this.links.filter(link => !link.navItem.disabled);
    const {length} = enabledLinks;

    let position = -1;

    enabledLinks.forEach((link, index) => {
      if (link.elRef.nativeElement === this._document.activeElement) {
        position = index;
      }
    });

    if (length) {
      switch (key) {
        case Key.ArrowLeft:
          if (this.orientation === 'vertical') {
            return;
          }
          position = (position - 1 + length) % length;
          break;
        case Key.ArrowRight:
          if (this.orientation === 'vertical') {
            return;
          }
          position = (position + 1) % length;
          break;
        case Key.ArrowDown:
          if (this.orientation === 'horizontal') {
            return;
          }
          position = (position + 1) % length;
          break;
        case Key.ArrowUp:
          if (this.orientation === 'horizontal') {
            return;
          }
          position = (position - 1 + length) % length;
          break;
        case Key.Home:
          position = 0;
          break;
        case Key.End:
          position = length - 1;
          break;
      }
      if (this.keyboard === 'changeWithArrows') {
        this.select(enabledLinks[position].navItem.id);
      }
      enabledLinks[position].elRef.nativeElement.focus();

      event.preventDefault();
    }
  }

  /**
   * Selects the nav with the given id and shows its associated pane.
   * Any other nav that was previously selected becomes unselected and its associated pane is hidden.
   */
  select(id: any) { this._updateActiveId(id, false); }

  ngAfterContentInit() {
    if (!isDefined(this.activeId)) {
      const nextId = this.items.first ? this.items.first.id : null;
      if (isValidNavId(nextId)) {
        this._updateActiveId(nextId, false);
        this._cd.detectChanges();
      }
    }
  }

  private _updateActiveId(nextId: any, emitNavChange = true) {
    if (this.activeId !== nextId) {
      let defaultPrevented = false;

      if (emitNavChange) {
        this.navChange.emit({activeId: this.activeId, nextId, preventDefault: () => { defaultPrevented = true; }});
      }

      if (!defaultPrevented) {
        this.activeId = nextId;
        this.activeIdChange.emit(nextId);
      }
    }
  }
}


/**
 * A directive to put on the nav link.
 *
 * @since 5.2.0
 */
@Directive({
  selector: 'a[ngbNavLink]',
  host: {
    '[id]': 'navItem.domId',
    '[class.nav-link]': 'true',
    '[class.nav-item]': 'hasNavItemClass()',
    '[attr.role]': `role ? role : nav.roles ? 'tab' : undefined`,
    'href': '',
    '[class.active]': 'navItem.active',
    '[class.disabled]': 'navItem.disabled',
    '[attr.tabindex]': 'navItem.disabled ? -1 : undefined',
    '[attr.aria-controls]': 'navItem.isPanelInDom() ? navItem.panelDomId : null',
    '[attr.aria-selected]': 'navItem.active',
    '[attr.aria-disabled]': 'navItem.disabled',
    '(click)': 'nav.click(navItem); $event.preventDefault()'
  }
})
export class NgbNavLink {
  constructor(
      @Attribute('role') public role: string, public navItem: NgbNavItem, public nav: NgbNav,
      public elRef: ElementRef) {}

  hasNavItemClass() {
    // with alternative markup we have to add `.nav-item` class, because `ngbNavItem` is on the ng-container
    return this.navItem.elementRef.nativeElement.nodeType === Node.COMMENT_NODE;
  }
}


/**
 * The payload of the change event emitted right before the nav change happens on user click.
 *
 * This event won't be emitted if nav is changed programmatically via `[activeId]` or `.select()`.
 *
 * @since 5.2.0
 */
export interface NgbNavChangeEvent<T = any> {
  /**
   * Id of the currently active nav.
   */
  activeId: T;

  /**
   * Id of the newly selected nav.
   */
  nextId: T;

  /**
   * Function that will prevent nav change if called.
   */
  preventDefault: () => void;
}
