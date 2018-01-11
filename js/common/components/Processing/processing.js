// @flow
import React, {Component} from 'react';

class Processing extends Component {
  constructor(props, context) {
    super(props, context);
  }

  render() {
    return (<div className="processingImage">
        <div className="subContainer">
          <p className="processing">Please wait, Data Sync is Processing<span>.</span><span>.</span><span>.</span></p>
        </div>
      </div>
    );
  }
}

export default (Processing);

