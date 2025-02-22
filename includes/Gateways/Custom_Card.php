<?php
namespace WeDevs\WePOS\Gateways;

/**
* Credit Card gateway payment for POS
*/
class Custom_Card extends \WC_Payment_Gateway {

    /**
     * Constructor for the gateway.
     */
    public function __construct() {
        // Setup general properties.
        $this->setup_properties();

        // Load the settings.
        $this->init_form_fields();
        $this->init_settings();

        // Get settings.
        $this->enabled            = 'yes';
        $this->title              = $this->get_option( 'title' );
        $this->description        = $this->get_option( 'description' );
        $this->instructions       = $this->get_option( 'instructions' );
        $this->enable_for_methods = $this->get_option( 'enable_for_methods', array() );
        $this->enable_for_virtual = $this->get_option( 'enable_for_virtual', 'yes' ) === 'yes';

        add_action( 'woocommerce_update_options_payment_gateways_' . $this->id, array( $this, 'process_admin_options' ) );
    }

    /**
     * Setup general properties for the gateway.
     */
    protected function setup_properties() {
        $this->id                 = 'wepos_ccard';
        $this->icon               = apply_filters( 'wepos_ccard_icon', '' );
        $this->method_title       = __( 'Credit Card (only wePOS)', 'wepos' );
        $this->method_description = __( 'JUST WEPOS Have your customers pay with ccard', 'wepos' );
        $this->has_fields         = false;
    }

    /**
     * Initialise Gateway Settings Form Fields.
     */
    public function init_form_fields() {

        $this->form_fields = array(
            'enabled'            => array(
                'title'       => __( 'Enable/Disable', 'wepos' ),
                'label'       => __( 'Enable Card gateway', 'wepos' ),
                'type'        => 'checkbox',
                'description' => '',
                'default'     => 'yes',
                'disabled'    => true
            ),
            'title'              => array(
                'title'       => __( 'Title', 'wepos' ),
                'type'        => 'text',
                'description' => __( 'Payment method description that the marchent see in pos checkout', 'wepos' ),
                'default'     => __( 'Credit Card wePOS', 'wepos' ),
                'desc_tip'    => true,
                'disabled'    => true
            ),
            'description'        => array(
                'title'       => __( 'Description', 'wepos' ),
                'type'        => 'textarea',
                'description' => __( 'Payment method description that marchent see in pos checkout page', 'wepos' ),
                'default'     => __( 'Pay with Card', 'wepos' ),
                'desc_tip'    => true,
                'disabled'    => true
            )
        );
    }

    /**
     * Check If The Gateway Is Available For Use.
     *
     * @return bool
     */
    public function is_available() {
        return is_admin() || wepos_is_frontend();
    }

    /**
     * Process the payment and return the result.
     *
     * @param int $order_id Order ID.
     *
     * @return array
     *
     * @throws \WC_Data_Exception
     */
    public function process_payment( $order_id ) {
        $order = wc_get_order( $order_id );

        // Mark as processing or on-hold (payment won't be taken until delivery).
        $order->payment_complete();

        $order->update_status( 'completed', __( 'Payment collected via Credit Card', 'wepos' ) );
        $order->add_order_note(
            sprintf(
                /* translators: 1: Credit Card tendered amount 2: Credit Card change amount. */
                __( 'Credit Card tendered amount: %1$s, Change amount: %2$s', 'wepos' ),
                $order->get_meta( '_wepos_ccard_tendered_amount', true ),
                $order->get_meta( '_wepos_ccard_change_amount', true )
            )
        );

        $order->save();

        // Return thankyou redirect.
        return array(
            'result'   => 'success',
        );
    }

 }
