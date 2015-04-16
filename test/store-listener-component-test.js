import Alt from '../dist/alt-with-runtime'
import React from 'react/addons'
import AltContainer from '../components/AltContainer'
import withAltContext from '../utils/withAltContext'
import { assert } from 'chai'
import { jsdom } from 'jsdom'
import sinon from 'sinon'

const { TestUtils } = React.addons

const alt = new Alt()

const action = alt.generateActions('sup')

const TestStore = alt.createStore({
  displayName: 'TestStore',

  bindListeners: {
    handleSup: action.sup
  },

  state: { x: null },

  handleSup(x) {
    this.state.x = x
  }
})

const Store2 = alt.createStore({
  displayName: 'Store2',

  bindListeners: {
    onSup: action.sup
  },

  state: { y: null },

  onSup(y) {
    this.state.y = y
  }
})

class Flux extends Alt {
  constructor() {
    super()

    this.addActions('testActions', function () {
      this.generateActions('test')
    })

    this.addStore('testStore', {
      bindListeners: {
        test: this.getActions('testActions').test
      },

      state: { x: null },

      test(x) {
        this.state.x = x
      }
    })
  }
}

export default {
  'AltContainer': {
    beforeEach() {
      global.document = jsdom('<!doctype html><html><body></body></html>')
      global.window = global.document.parentWindow
      global.navigator = global.window.navigator

      alt.recycle()
    },

    afterEach() {
      delete global.document
      delete global.window
      delete global.navigator
    },

    'element mounts and unmounts'() {
      const div = document.createElement('div')
      React.render(
        <AltContainer>
          <div />
        </AltContainer>
      , div)

      React.unmountComponentAtNode(div)
    },

    'many elements mount'() {
      TestUtils.renderIntoDocument(
        <AltContainer>
          <div />
          <div />
          <div />
          <div />
        </AltContainer>
      )
    },

    'element has correct state'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer stores={{ TestStore }}>
          <div />
        </AltContainer>
      )

      action.sup('hello')

      assert(node.state.TestStore.x === 'hello')

      action.sup('bye')

      assert(node.state.TestStore.x === 'bye')
    },

    'works with context'() {
      const flux = new Flux()

      const ContextComponent = withAltContext(flux, AltContainer)
      const tree = TestUtils.renderIntoDocument(<ContextComponent />)

      const contextComponent = TestUtils.findRenderedComponentWithType(
        tree,
        AltContainer
      )

      assert.instanceOf(contextComponent.context.flux, Flux)
    },

    'children get flux as props with context'() {
      const flux = new Flux()

      const TestComponent = React.createClass({
        render() {
          return (
            <AltContainer>
              <div>
                <div>
                  <AltContainer>
                    <span />
                  </AltContainer>
                </div>
              </div>
            </AltContainer>
          )
        }
      })

      const WrappedComponent = withAltContext(flux, TestComponent)

      const node = TestUtils.renderIntoDocument(<WrappedComponent />)
      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')

      assert.instanceOf(span.props.flux, Flux)
    },

    'works with instances and props'() {
      const flux = new Flux()

      const node = TestUtils.renderIntoDocument(
        <AltContainer flux={flux}>
          <div />
        </AltContainer>
      )

      assert.instanceOf(node.props.flux, Flux, 'component gets flux prop')
    },

    'children have the flux prop'() {
      const flux = new Flux()

      const node = TestUtils.renderIntoDocument(
        <AltContainer flux={flux}>
          <span />
        </AltContainer>
      )

      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')

      assert.instanceOf(span.props.flux, Flux)
    },

    'children get the state via props'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer stores={{ TestStore }}>
          <span />
        </AltContainer>
      )

      action.sup('foobar')

      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')

      assert(span.props.TestStore.x === 'foobar')
    },

    'many children get state via props'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer stores={{ TestStore }}>
          <span />
          <strong />
          <em />
        </AltContainer>
      )

      action.sup('foobar')

      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')
      const strong = TestUtils.findRenderedDOMComponentWithTag(node, 'strong')
      const em = TestUtils.findRenderedDOMComponentWithTag(node, 'em')

      assert(span.props.TestStore.x === 'foobar')
      assert(strong.props.TestStore.x === 'foobar')
      assert(em.props.TestStore.x === 'foobar')
    },

    'passing in other props'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer className="no" stores={{ TestStore }}>
          <div className="hello" />
        </AltContainer>
      )

      const div = TestUtils.findRenderedDOMComponentWithTag(node, 'div')

      assert(div.props.className === 'hello')
      assert.isUndefined(div.props.stores)
    },

    'does not wrap if it does not have to'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer>
          <span />
        </AltContainer>
      )

      assert(node.props.children.type === 'span', 'single node does not wrap')

      const many = TestUtils.renderIntoDocument(
        <AltContainer>
          <span />
          <span />
        </AltContainer>
      )

      assert.ok(Array.isArray(many.props.children), 'multiple nodes are wrapped')
    },

    'passing in a single store'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer store={TestStore}>
          <span />
        </AltContainer>
      )
      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')

      action.sup('just testing')

      assert(span.props.x === 'just testing')
    },

    'pass in single function'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer store={() => {
          return {
            store: TestStore,
            value: { x: 'jesting' }
          }
        }}>
          <span />
        </AltContainer>
      )
      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')

      assert(span.props.x === 'jesting')
    },

    'function is called with props'() {
      const storeFunction = sinon.stub()
      storeFunction.returns({
        store: TestStore,
        value: {}
      })

      TestUtils.renderIntoDocument(
        <AltContainer className="foo" store={storeFunction}>
          <span />
        </AltContainer>
      )

      assert.ok(storeFunction.calledTwice, 'called twice, once for store listening and another for props')
      assert(storeFunction.args[0].length === 1, 'called with one parameter')
      assert(storeFunction.args[1].length === 1, 'called with one parameter')
      assert.isObject(storeFunction.args[0][0], 'called with the props')
      assert.isObject(storeFunction.args[1][0], 'called with the props')
      assert(storeFunction.args[0][0].className === 'foo', 'props match')
      assert(storeFunction.args[1][0].className === 'foo', 'props match')
    },

    'pass in key-value of functions'() {
      const Functions = {
        x() {
          return {
            store: TestStore,
            value: { a: 'hello' }
          }
        },
        y() {
          return {
            store: TestStore,
            value: { b: 'goodbye' }
          }
        }
      }

      const node = TestUtils.renderIntoDocument(
        <AltContainer stores={Functions}>
          <span />
        </AltContainer>
      )
      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')

      assert(span.props.x.a === 'hello')
      assert(span.props.y.b === 'goodbye')
    },

    'nested components pass down flux'() {
      const flux = new Flux()
      const node = TestUtils.renderIntoDocument(
        <AltContainer flux={flux}>
          <AltContainer>
            <span />
          </AltContainer>
        </AltContainer>
      )
      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')

      assert.instanceOf(span.props.flux, Flux)
    },

    'custom rendering'() {
      const render = sinon.stub()
      render.onCall(0).returns(null)
      TestUtils.renderIntoDocument(
        <AltContainer render={render} />
      )

      assert.ok(render.calledOnce, 'render was called')

      const node = TestUtils.renderIntoDocument(
        <AltContainer
          stores={{TestStore}}
          render={(props) => {
            assert.isDefined(props.TestStore, 'test store exists in props')
            return <span className="testing testing" />
          }}
        />
      )
      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')

      assert(span.props.className === 'testing testing')
    },

    'define both stores and store'() {
      assert.throws(() => {
        TestUtils.renderIntoDocument(
          <AltContainer stores={{}} store={TestStore} />
        )
      })
    },

    'changing an already mounted components props'() {
      let cb = null

      const El = React.createClass({
        getInitialState() {
          return { store: TestStore }
        },

        componentDidMount() {
          cb = state => this.setState(state)
        },

        render() {
          return (
            <AltContainer ref="test" store={this.state.store}>
              <span />
            </AltContainer>
          )
        }
      })

      const node = TestUtils.renderIntoDocument(<El />)

      assert(node.refs.test.props.store === TestStore, 'node gets first state')

      cb({ store: Store2 })

      assert(node.refs.test.props.store === Store2, 'node changes props properly')
    },

    'inject actions'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer actions={{ MyActions: action }}>
          <span />
        </AltContainer>
      )

      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')

      assert.isObject(span.props.MyActions, 'MyActions exist')
      assert(span.props.MyActions === action, 'MyActions is injected actions')
      assert.isFunction(span.props.MyActions.sup, 'sup action is available')
    },

    'inject all actions directly shorthand'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer actions={action}>
          <span />
        </AltContainer>
      )

      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')

      assert.isFunction(span.props.sup, 'sup is available directly on the props')
    },

    'inject all actions using a function'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer actions={function (props) {
          return {
            FooActions: {
              sup: action.sup.bind(action)
            }
          }
        }}>
          <span />
        </AltContainer>
      )

      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')

      assert.isObject(span.props.FooActions, 'actions are injected')
      assert.isFunction(span.props.FooActions.sup, 'sup is available')
    },

    'scu'() {
      const scu = sinon.stub().returns(true)

      const node = TestUtils.renderIntoDocument(
        <AltContainer shouldComponentUpdate={scu} store={TestStore}>
          <span />
        </AltContainer>
      )

      action.sup()
      assert.ok(scu.calledOnce, 'custom shouldComponentUpdate was called')
      assert(scu.args[0].length === 1, 'only one arg is passed, the props')
      assert.isDefined(scu.args[0][0].x, 'x prop exists')
    },

    'injectables'() {
      const node = TestUtils.renderIntoDocument(
        <AltContainer stores={[TestStore]} inject={{
          className: 'foo',
          foo: function () {
            return TestStore.getState()
          }
        }}>
          <span />
        </AltContainer>
      )

      const span = TestUtils.findRenderedDOMComponentWithTag(node, 'span')

      assert(span.props.className === 'foo', 'you can inject custom things')
      assert.isDefined(span.props.foo.x, 'functions are ran')

      action.sup(888)

      assert(span.props.foo.x === 888, 'when passing stores as Array they are just listened on')
    },
  }
}
